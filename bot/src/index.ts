import { Context, Telegraf, session } from 'telegraf';
import { Update } from 'telegraf/typings/core/types/typegram';
import dayjs from 'dayjs';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { config } from './config';
import { connectDatabase, CheckModel, InvoiceModel, SubscriptionHistoryModel, UserDocument, UserModel } from './models';
import { generateSecretKey, hashSecretKey } from './services/secretKey';
import { keyboards } from './keyboards';
import { SupportedLanguage, t } from './i18n';
import { nowPaymentsClient, SupportedCurrency } from './services/payments';
import { extractNumbersFromText, stubCheck } from './services/checker';
import { extractNumbersFromImage } from './services/ocr';
import { mergeUserAccounts } from './services/userMerge';
import { calculateExpiry, formatCheckResults, formatDate } from './utils';

interface DepositSession {
  amountUsd?: number;
  currency?: SupportedCurrency;
  invoiceId?: string;
  messageId?: number;
  chatId?: number;
}

interface CheckSession {
  mode?: 'text' | 'file' | 'screenshot';
  results?: { number: string; status: string; reason?: string }[];
  sourceType?: 'text' | 'file' | 'screenshot';
  summaryMessageId?: number;
}

interface BotSession {
  pendingSecretKey?: string;
  awaiting?: 'secretKeyRestore' | 'depositAmount' | 'checkText' | 'checkFile' | 'checkScreenshot';
  deposit?: DepositSession;
  check?: CheckSession;
  lastCheckAt?: number;
}

interface BotContext extends Context<Update> {
  session: BotSession;
  dbUser?: UserDocument;
  lang: SupportedLanguage;
}

const bot = new Telegraf<BotContext>(config.botToken);
const invoiceIntervals = new Map<string, NodeJS.Timeout>();

function scheduleDelete(ctx: BotContext, chatId: number, messageId: number, delayMs: number) {
  setTimeout(() => {
    ctx.telegram.deleteMessage(chatId, messageId).catch(() => undefined);
  }, delayMs);
}

function ensureSession(ctx: BotContext) {
  if (!ctx.session.deposit) {
    ctx.session.deposit = {};
  }
  if (!ctx.session.check) {
    ctx.session.check = {};
  }
}

bot.use(session({ defaultSession: (): BotSession => ({ deposit: {}, check: {} }) }));

bot.use(async (ctx, next) => {
  if (!ctx.from) return next();

  await connectDatabase(config.mongoUri);

  let user = await UserModel.findOne({ tgId: ctx.from.id });

  if (!user) {
    const secretKey = generateSecretKey();
    user = await UserModel.create({
      tgId: ctx.from.id,
      lang: 'en',
      balanceUsd: 0,
      subscription: { active: false },
      secretKeyHash: hashSecretKey(secretKey),
    });
    ctx.session.pendingSecretKey = secretKey;
  }

  ctx.dbUser = user;
  ctx.lang = user.lang ?? 'en';

  return next();
});

function languageFromCallback(data: string): SupportedLanguage | undefined {
  const [, lang] = data.split(':');
  if (lang === 'en' || lang === 'ru' || lang === 'zh') {
    return lang;
  }
  return undefined;
}

async function sendHome(ctx: BotContext) {
  const lang = ctx.lang;
  await ctx.reply(t(lang, 'welcome'), keyboards.mainMenu({
    check: t(lang, 'btnCheck'),
    deposit: t(lang, 'btnDeposit'),
    buy: t(lang, 'btnBuySubscription'),
  }));
}

async function showLanguageSelector(ctx: BotContext) {
  const message = await ctx.reply(t('en', 'welcome'), keyboards.languageSelector());
  scheduleDelete(ctx, message.chat.id, message.message_id, 5 * 60 * 1000);
}

async function showSecretKey(ctx: BotContext, key: string) {
  const message = await ctx.reply(t(ctx.lang, 'secretKeyTitle', { key }),
    keyboards.secretKey({
      saved: t(ctx.lang, 'btnSaveKey'),
      load: t(ctx.lang, 'btnLoadKey'),
      hide: t(ctx.lang, 'btnHide'),
    })
  );
  scheduleDelete(ctx, message.chat.id, message.message_id, 120 * 1000);
}

function hasActiveSubscription(user: UserDocument): boolean {
  if (!user.subscription?.active || !user.subscription?.expiresAt) {
    return false;
  }

  return dayjs(user.subscription.expiresAt).isAfter(dayjs());
}

bot.start(async (ctx) => {
  if (!ctx.from) return;
  ensureSession(ctx);

  if (ctx.session.pendingSecretKey) {
    await showSecretKey(ctx, ctx.session.pendingSecretKey);
    ctx.session.pendingSecretKey = undefined;
  }

  await showLanguageSelector(ctx);
});

bot.action(/^lang:/, async (ctx) => {
  const lang = languageFromCallback(ctx.callbackQuery.data ?? '');
  if (!lang || !ctx.dbUser) {
    return ctx.answerCbQuery();
  }
  ctx.dbUser.lang = lang;
  ctx.lang = lang;
  await ctx.dbUser.save();
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(lang, 'welcome'));
  await sendHome(ctx);
});

bot.action('secret:saved', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(t(ctx.lang, 'secretKeySaved'));
});

bot.action('secret:hide', async (ctx) => {
  await ctx.answerCbQuery();
  if ('message' in ctx.callbackQuery) {
    const message = ctx.callbackQuery.message;
    await ctx.telegram.deleteMessage(message.chat.id, message.message_id).catch(() => undefined);
  }
});

bot.action('secret:load', async (ctx) => {
  ensureSession(ctx);
  await ctx.answerCbQuery();
  ctx.session.awaiting = 'secretKeyRestore';
  const message = await ctx.reply(t(ctx.lang, 'secretKeyPrompt'));
  scheduleDelete(ctx, message.chat.id, message.message_id, 5 * 60 * 1000);
});

bot.on('text', async (ctx, next) => {
  ensureSession(ctx);
  if (!ctx.dbUser) return next();

  switch (ctx.session.awaiting) {
    case 'secretKeyRestore': {
      const provided = ctx.message.text.trim();
      const hash = hashSecretKey(provided);
      const existing = await UserModel.findOne({ secretKeyHash: hash });
      if (!existing) {
        await ctx.reply(t(ctx.lang, 'secretKeyInvalid'));
        return;
      }

      const merged = await mergeUserAccounts(ctx.dbUser, existing);
      ctx.dbUser = merged;
      ctx.lang = merged.lang;
      ctx.session.awaiting = undefined;
      await ctx.reply(t(ctx.lang, 'restoreSuccess'));
      await sendHome(ctx);
      return;
    }
    case 'depositAmount': {
      const value = Number(ctx.message.text.replace(',', '.'));
      if (Number.isNaN(value)) {
        await ctx.reply(t(ctx.lang, 'invalidAmount'));
        return;
      }
      if (value < config.minDepositUsd || value > config.maxDepositUsd) {
        await ctx.reply(t(ctx.lang, 'amountRange', { min: config.minDepositUsd, max: config.maxDepositUsd }));
        return;
      }
      ctx.session.deposit = { amountUsd: value };
      ctx.session.awaiting = undefined;
      const message = await ctx.reply(t(ctx.lang, 'chooseCurrency'), keyboards.depositCurrenciesPage1({
        usdt: t(ctx.lang, 'btnUsdt'),
        ton: t(ctx.lang, 'btnTon'),
        more: t(ctx.lang, 'btnMore'),
      }));
      scheduleDelete(ctx, message.chat.id, message.message_id, 5 * 60 * 1000);
      return;
    }
    case 'checkText': {
      const numbers = extractNumbersFromText(ctx.message.text);
      await processNumbers(ctx, numbers, 'text');
      ctx.session.awaiting = undefined;
      return;
    }
    default:
      break;
  }

  return next();
});

async function processNumbers(ctx: BotContext, numbers: string[], sourceType: 'text' | 'file' | 'screenshot') {
  if (!ctx.dbUser) return;
  const now = Date.now();
  if (ctx.session.lastCheckAt && now - ctx.session.lastCheckAt < 10_000) {
    await ctx.reply(t(ctx.lang, 'rateLimit'));
    return;
  }
  if (numbers.length === 0) {
    await ctx.reply(t(ctx.lang, 'invalidInput'));
    return;
  }
  if (numbers.length > 1000) {
    await ctx.reply(t(ctx.lang, 'maxNumbers'));
    return;
  }

  const processingMessage = await ctx.reply(t(ctx.lang, 'processing'));
  const results = stubCheck(numbers);

  const summary = results.reduce(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { clean: 0, locked: 0, blocked: 0, error: 0 }
  );

  const summaryText = `${formatCheckResults(results)}\n\n${t(ctx.lang, 'checkSummary', summary)}`;
  await ctx.telegram.deleteMessage(processingMessage.chat.id, processingMessage.message_id).catch(() => undefined);
  const message = await ctx.reply(summaryText, keyboards.checkResults({
    export: t(ctx.lang, 'btnExport'),
    again: t(ctx.lang, 'btnNewCheck'),
    back: t(ctx.lang, 'btnBack'),
  }));
  scheduleDelete(ctx, message.chat.id, message.message_id, 24 * 60 * 60 * 1000);

  ctx.session.check = {
    mode: undefined,
    results,
    sourceType,
    summaryMessageId: message.message_id,
  };
  ctx.session.lastCheckAt = now;

  await CheckModel.create({
    userId: ctx.dbUser._id,
    sourceType,
    total: numbers.length,
    clean: summary.clean,
    locked: summary.locked,
    blocked: summary.blocked,
    error: summary.error,
    results,
  });
}

async function ensureActiveSubscription(ctx: BotContext): Promise<boolean> {
  if (!ctx.dbUser) return false;
  if (hasActiveSubscription(ctx.dbUser)) {
    return true;
  }
  await ctx.reply(
    t(ctx.lang, 'subscriptionRequired'),
    keyboards.subscriptionRequired({
      buy: t(ctx.lang, 'btnBuySubscription'),
      deposit: t(ctx.lang, 'btnDeposit'),
      back: t(ctx.lang, 'btnBack'),
    })
  );
  return false;
}

bot.action('home:back', async (ctx) => {
  await ctx.answerCbQuery();
  await sendHome(ctx);
});

bot.action('home:check', async (ctx) => {
  await ctx.answerCbQuery();
  ensureSession(ctx);
  if (!(await ensureActiveSubscription(ctx))) {
    return;
  }
  ctx.session.awaiting = undefined;
  const message = await ctx.reply(
    t(ctx.lang, 'checkPrompt'),
    keyboards.checkInput({
      text: t(ctx.lang, 'btnSendText'),
      file: t(ctx.lang, 'btnUploadTxt'),
      screenshot: t(ctx.lang, 'btnUploadScreenshot'),
    })
  );
  scheduleDelete(ctx, message.chat.id, message.message_id, 5 * 60 * 1000);
});

bot.action('check:text', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.awaiting = 'checkText';
  await ctx.reply(t(ctx.lang, 'enterText'));
});

bot.action('check:file', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.awaiting = 'checkFile';
  await ctx.reply(t(ctx.lang, 'uploadTxt'));
});

bot.action('check:screenshot', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.awaiting = 'checkScreenshot';
  await ctx.reply(t(ctx.lang, 'uploadScreenshot'));
});

bot.on('document', async (ctx) => {
  ensureSession(ctx);
  if (!ctx.dbUser || ctx.session.awaiting !== 'checkFile') return;
  const document = ctx.message.document;
  if (!document || !document.file_name?.endsWith('.txt')) {
    await ctx.reply(t(ctx.lang, 'invalidInput'));
    return;
  }
  const file = await ctx.telegram.getFile(document.file_id);
  const url = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  const content = Buffer.from(response.data).toString('utf-8');
  const numbers = extractNumbersFromText(content);
  await processNumbers(ctx, numbers, 'file');
  ctx.session.awaiting = undefined;
});

bot.on('photo', async (ctx) => {
  ensureSession(ctx);
  if (!ctx.dbUser || ctx.session.awaiting !== 'checkScreenshot') return;
  const photos = ctx.message.photo;
  const file = await ctx.telegram.getFile(photos[photos.length - 1].file_id);
  const url = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  const numbers = await extractNumbersFromImage(Buffer.from(response.data));
  await processNumbers(ctx, numbers, 'screenshot');
  ctx.session.awaiting = undefined;
});

bot.action('check:again', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.check = {};
  await sendHome(ctx);
});

bot.action('check:export', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.session.check?.results) {
    return;
  }
  const content = formatCheckResults(ctx.session.check.results);
  const filePath = path.join(tmpdir(), `check-${Date.now()}.txt`);
  await fs.writeFile(filePath, content, 'utf-8');
  await ctx.replyWithDocument({ source: filePath, filename: 'results.txt' }, { caption: t(ctx.lang, 'exportReady') });
  await fs.unlink(filePath).catch(() => undefined);
});

bot.action('home:deposit', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.awaiting = 'depositAmount';
  const message = await ctx.reply(t(ctx.lang, 'depositPromptAmount'));
  scheduleDelete(ctx, message.chat.id, message.message_id, 5 * 60 * 1000);
});

bot.action('home:subscribe', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    t(ctx.lang, 'subscriptionPrompt'),
    keyboards.subscriptionPlans({
      daily: t(ctx.lang, 'btnDaily'),
      weekly: t(ctx.lang, 'btnWeekly'),
      monthly: t(ctx.lang, 'btnMonthly'),
    })
  );
});

bot.action('deposit:more', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(
    keyboards.depositCurrenciesPage2({
      trx: t(ctx.lang, 'btnTrx'),
      btc: t(ctx.lang, 'btnBtc'),
      back: t(ctx.lang, 'btnBack'),
    }).reply_markup
  );
});

bot.action('deposit:back', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(
    keyboards.depositCurrenciesPage1({
      usdt: t(ctx.lang, 'btnUsdt'),
      ton: t(ctx.lang, 'btnTon'),
      more: t(ctx.lang, 'btnMore'),
    }).reply_markup
  );
});

bot.action(/^deposit:currency:/, async (ctx) => {
  ensureSession(ctx);
  if (!ctx.session.deposit?.amountUsd || !ctx.dbUser) {
    await ctx.answerCbQuery();
    return;
  }
  const currency = ctx.callbackQuery.data.split(':')[2] as SupportedCurrency;
  ctx.session.deposit.currency = currency;
  await ctx.answerCbQuery();

  const invoice = await nowPaymentsClient.createInvoice({
    userId: ctx.dbUser._id.toString(),
    amountUsd: ctx.session.deposit.amountUsd,
    currency,
  });

  ctx.session.deposit.invoiceId = invoice._id.toString();
  const chatId = ctx.callbackQuery.message?.chat.id;
  const messageId = ctx.callbackQuery.message?.message_id;

  await ctx.editMessageText(
    t(ctx.lang, 'invoiceDetails', {
      minutes: 30,
      amount: invoice.amountUsd,
      currency: invoice.payCurrency,
      address: invoice.address,
    }),
    keyboards.invoice({
      paid: t(ctx.lang, 'btnPaid'),
      change: t(ctx.lang, 'btnChangeCurrency'),
      cancel: t(ctx.lang, 'btnCancel'),
    })
  );
  if (chatId && messageId) {
    ctx.session.deposit.chatId = chatId;
    ctx.session.deposit.messageId = messageId;
    scheduleInvoiceCountdown(ctx, invoice._id.toString(), chatId, messageId, invoice.expiresAt);
  }
});

function scheduleInvoiceCountdown(ctx: BotContext, invoiceId: string, chatId: number, messageId: number, expiresAt: Date) {
  const interval = setInterval(async () => {
    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) {
      clearInterval(interval);
      invoiceIntervals.delete(invoiceId);
      return;
    }
    if (invoice.status !== 'pending') {
      clearInterval(interval);
      invoiceIntervals.delete(invoiceId);
      return;
    }
    const minutes = Math.max(0, Math.ceil((dayjs(expiresAt).diff(dayjs(), 'minute', true))));
    if (minutes <= 0) {
      invoice.status = 'expired';
      await invoice.save();
      clearInterval(interval);
      invoiceIntervals.delete(invoiceId);
      await ctx.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        t(ctx.lang, 'invoiceExpired')
      );
      ctx.session.deposit = {};
      await sendHome(ctx);
      return;
    }
    await ctx.telegram.editMessageText(
      chatId,
      messageId,
      undefined,
      t(ctx.lang, 'invoiceDetails', {
        minutes,
        amount: invoice.amountUsd,
        currency: invoice.payCurrency,
        address: invoice.address,
      }),
      keyboards.invoice({
        paid: t(ctx.lang, 'btnPaid'),
        change: t(ctx.lang, 'btnChangeCurrency'),
        cancel: t(ctx.lang, 'btnCancel'),
      })
    ).catch(() => undefined);
  }, 60 * 1000);

  invoiceIntervals.set(invoiceId, interval);
}

bot.action('deposit:paid', async (ctx) => {
  await ctx.answerCbQuery(t(ctx.lang, 'payChecking'));
  if (!ctx.session.deposit?.invoiceId) return;
  const invoice = await InvoiceModel.findById(ctx.session.deposit.invoiceId);
  if (!invoice || !ctx.dbUser) return;

  const status = await nowPaymentsClient.getInvoiceStatus(invoice);
  if (status.status === 'finished') {
    invoice.status = 'confirmed';
    await invoice.save();
    ctx.dbUser.balanceUsd += invoice.amountUsd;
    await ctx.dbUser.save();
    await ctx.editMessageText(t(ctx.lang, 'depositConfirmed'));
    ctx.session.deposit = {};
    await sendHome(ctx);
  } else if (status.status === 'expired') {
    invoice.status = 'expired';
    await invoice.save();
    await ctx.editMessageText(t(ctx.lang, 'invoiceExpired'));
    ctx.session.deposit = {};
    await sendHome(ctx);
  } else {
    await ctx.editMessageText(t(ctx.lang, 'paymentPending'));
  }
});

bot.action('deposit:change', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.session.deposit?.amountUsd) return;
  if (ctx.session.deposit.invoiceId) {
    const interval = invoiceIntervals.get(ctx.session.deposit.invoiceId);
    if (interval) {
      clearInterval(interval);
      invoiceIntervals.delete(ctx.session.deposit.invoiceId);
    }
    const invoice = await InvoiceModel.findById(ctx.session.deposit.invoiceId);
    if (invoice) {
      invoice.status = 'cancelled';
      await invoice.save();
    }
    ctx.session.deposit.invoiceId = undefined;
  }
  await ctx.editMessageText(
    t(ctx.lang, 'chooseCurrency'),
    keyboards.depositCurrenciesPage1({
      usdt: t(ctx.lang, 'btnUsdt'),
      ton: t(ctx.lang, 'btnTon'),
      more: t(ctx.lang, 'btnMore'),
    })
  );
});

bot.action('deposit:cancel', async (ctx) => {
  await ctx.answerCbQuery();
  if (ctx.session.deposit?.invoiceId) {
    const interval = invoiceIntervals.get(ctx.session.deposit.invoiceId);
    if (interval) {
      clearInterval(interval);
      invoiceIntervals.delete(ctx.session.deposit.invoiceId);
    }
    const invoice = await InvoiceModel.findById(ctx.session.deposit.invoiceId);
    if (invoice) {
      invoice.status = 'cancelled';
      await invoice.save();
    }
  }
  ctx.session.deposit = {};
  await ctx.editMessageText(t(ctx.lang, 'depositCancelled'));
  await sendHome(ctx);
});

const planPrices = {
  daily: 10,
  weekly: 50,
  monthly: 150,
};

type PlanKey = keyof typeof planPrices;

async function activatePlan(ctx: BotContext, plan: PlanKey) {
  if (!ctx.dbUser) return;
  const price = planPrices[plan];
  if (ctx.dbUser.balanceUsd < price) {
    await ctx.reply(t(ctx.lang, 'insufficientBalance'));
    await sendHome(ctx);
    return;
  }
  ctx.dbUser.balanceUsd -= price;
  const expiry = calculateExpiry(plan);
  ctx.dbUser.subscription = { active: true, expiresAt: expiry.toDate() };
  await ctx.dbUser.save();

  await SubscriptionHistoryModel.create({
    userId: ctx.dbUser._id,
    plan,
    price,
    startedAt: new Date(),
    expiresAt: expiry.toDate(),
  });

  await ctx.reply(t(ctx.lang, 'subscriptionActivated', { date: formatDate(expiry.toDate()) }));
  await sendHome(ctx);
}

bot.action(/^plan:/, async (ctx) => {
  await ctx.answerCbQuery();
  const plan = ctx.callbackQuery.data.split(':')[1] as PlanKey;
  if (!['daily', 'weekly', 'monthly'].includes(plan)) {
    return;
  }
  await activatePlan(ctx, plan);
});

bot.command('admin', async (ctx) => {
  if (!ctx.from || String(ctx.from.id) !== config.adminId) {
    await ctx.reply(t(ctx.lang, 'notAllowed'));
    return;
  }
  await ctx.reply(
    t(ctx.lang, 'adminPanel'),
    keyboards.admin({
      users: t(ctx.lang, 'btnUsers'),
      subs: t(ctx.lang, 'btnSubscriptions'),
      payments: t(ctx.lang, 'btnPayments'),
    })
  );
});

bot.action('admin:users', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from || String(ctx.from.id) !== config.adminId) return;
  const totalUsers = await UserModel.countDocuments();
  const activeSubscriptions = await UserModel.countDocuments({ 'subscription.active': true, 'subscription.expiresAt': { $gt: new Date() } });
  await ctx.reply(`Users: ${totalUsers}\nActive subscriptions: ${activeSubscriptions}`);
});

bot.action('admin:subs', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from || String(ctx.from.id) !== config.adminId) return;
  const active = await SubscriptionHistoryModel.countDocuments({ expiresAt: { $gte: new Date() } });
  const expired = await SubscriptionHistoryModel.countDocuments({ expiresAt: { $lt: new Date() } });
  await ctx.reply(`Active: ${active}\nExpired: ${expired}`);
});

bot.action('admin:payments', async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from || String(ctx.from.id) !== config.adminId) return;
  const pending = await InvoiceModel.countDocuments({ status: 'pending' });
  const confirmed = await InvoiceModel.countDocuments({ status: 'confirmed' });
  await ctx.reply(`Pending: ${pending}\nConfirmed: ${confirmed}`);
});

export async function startBot() {
  await connectDatabase(config.mongoUri);
  await bot.launch();
  // eslint-disable-next-line no-console
  console.log('Bot started');
}

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
