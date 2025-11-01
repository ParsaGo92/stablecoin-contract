import { Markup } from 'telegraf';

type ButtonInput = {
  text: string;
  callbackData: string;
};

type KeyboardBlueprint = [ButtonInput, ButtonInput?, ButtonInput?];

function buildRows(blueprint: KeyboardBlueprint[]): ReturnType<typeof Markup.inlineKeyboard> {
  const rows = blueprint.map((row) => {
    const buttons = row
      .filter(Boolean)
      .map((button) => Markup.button.callback(button!.text, button!.callbackData));

    if (buttons.length === 2) {
      return buttons;
    }

    if (buttons.length === 1) {
      return [buttons[0]];
    }

    throw new Error('Each row must contain one or two buttons');
  });

  return Markup.inlineKeyboard(rows);
}

export const keyboards = {
  languageSelector: () =>
    buildRows([
      [
        { text: 'English', callbackData: 'lang:en' },
        { text: 'Русский', callbackData: 'lang:ru' },
      ],
      [{ text: '中文', callbackData: 'lang:zh' }],
    ]),
  secretKey: (translations: { saved: string; load: string; hide: string }) =>
    buildRows([
      [
        { text: translations.saved, callbackData: 'secret:saved' },
        { text: translations.load, callbackData: 'secret:load' },
      ],
      [{ text: translations.hide, callbackData: 'secret:hide' }],
    ]),
  mainMenu: (translations: { check: string; deposit: string; buy: string }) =>
    buildRows([
      [
        { text: translations.check, callbackData: 'home:check' },
        { text: translations.deposit, callbackData: 'home:deposit' },
      ],
      [{ text: translations.buy, callbackData: 'home:subscribe' }],
    ]),
  subscriptionRequired: (translations: { buy: string; deposit: string; back: string }) =>
    buildRows([
      [
        { text: translations.buy, callbackData: 'home:subscribe' },
        { text: translations.deposit, callbackData: 'home:deposit' },
      ],
      [{ text: translations.back, callbackData: 'home:back' }],
    ]),
  checkInput: (translations: { text: string; file: string; screenshot: string }) =>
    buildRows([
      [
        { text: translations.text, callbackData: 'check:text' },
        { text: translations.file, callbackData: 'check:file' },
      ],
      [{ text: translations.screenshot, callbackData: 'check:screenshot' }],
    ]),
  depositCurrenciesPage1: (translations: { usdt: string; ton: string; more: string }) =>
    buildRows([
      [
        { text: translations.usdt, callbackData: 'deposit:currency:USDTTRC20' },
        { text: translations.ton, callbackData: 'deposit:currency:TON' },
      ],
      [{ text: translations.more, callbackData: 'deposit:more' }],
    ]),
  depositCurrenciesPage2: (translations: { trx: string; btc: string; back: string }) =>
    buildRows([
      [
        { text: translations.trx, callbackData: 'deposit:currency:TRX' },
        { text: translations.btc, callbackData: 'deposit:currency:BTC' },
      ],
      [{ text: translations.back, callbackData: 'deposit:back' }],
    ]),
  invoice: (translations: { paid: string; change: string; cancel: string }) =>
    buildRows([
      [
        { text: translations.paid, callbackData: 'deposit:paid' },
        { text: translations.change, callbackData: 'deposit:change' },
      ],
      [{ text: translations.cancel, callbackData: 'deposit:cancel' }],
    ]),
  subscriptionPlans: (translations: { daily: string; weekly: string; monthly: string }) =>
    buildRows([
      [
        { text: translations.daily, callbackData: 'plan:daily' },
        { text: translations.weekly, callbackData: 'plan:weekly' },
      ],
      [{ text: translations.monthly, callbackData: 'plan:monthly' }],
    ]),
  checkResults: (translations: { export: string; again: string; back: string }) =>
    buildRows([
      [
        { text: translations.export, callbackData: 'check:export' },
        { text: translations.again, callbackData: 'check:again' },
      ],
      [{ text: translations.back, callbackData: 'home:back' }],
    ]),
  admin: (translations: { users: string; subs: string; payments: string }) =>
    buildRows([
      [
        { text: translations.users, callbackData: 'admin:users' },
        { text: translations.subs, callbackData: 'admin:subs' },
      ],
      [{ text: translations.payments, callbackData: 'admin:payments' }],
    ]),
};
