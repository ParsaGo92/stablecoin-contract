export type SupportedLanguage = 'en' | 'ru' | 'zh';

type Dictionary = Record<string, Record<SupportedLanguage, string>>;

export const dictionary: Dictionary = {
  welcome: {
    en: 'Welcome.',
    ru: 'Добро пожаловать.',
    zh: '欢迎。',
  },
  mainMenu: {
    en: 'Choose an option.',
    ru: 'Выберите действие.',
    zh: '请选择操作。',
  },
  secretKeyTitle: {
    en: 'Your secret key is: {key} Keep it safe.',
    ru: 'Ваш секретный ключ: {key} Сохраните его.',
    zh: '您的密钥是：{key} 请妥善保管。',
  },
  secretKeySaved: {
    en: 'Great! Keep it secure.',
    ru: 'Отлично! Берегите его.',
    zh: '很好！请妥善保管。',
  },
  secretKeyPrompt: {
    en: 'Enter your secret key to restore your account.',
    ru: 'Введите секретный ключ, чтобы восстановить аккаунт.',
    zh: '输入您的密钥以恢复账户。',
  },
  secretKeyInvalid: {
    en: 'Invalid key.',
    ru: 'Неверный ключ.',
    zh: '密钥无效。',
  },
  btnSaveKey: {
    en: 'I saved it',
    ru: 'Я сохранил',
    zh: '已保存',
  },
  btnLoadKey: {
    en: 'Load key back',
    ru: 'Восстановить',
    zh: '恢复密钥',
  },
  btnHide: {
    en: 'Hide',
    ru: 'Скрыть',
    zh: '隐藏',
  },
  btnCheck: {
    en: 'Check',
    ru: 'Проверить',
    zh: '验证',
  },
  btnDeposit: {
    en: 'Deposit',
    ru: 'Пополнить',
    zh: '充值',
  },
  btnBuySubscription: {
    en: 'Buy subscription',
    ru: 'Купить подписку',
    zh: '购买订阅',
  },
  btnBack: {
    en: 'Back',
    ru: 'Назад',
    zh: '返回',
  },
  btnSendText: {
    en: 'Send text',
    ru: 'Отправить текст',
    zh: '发送文本',
  },
  btnUploadTxt: {
    en: 'Upload txt',
    ru: 'Загрузить txt',
    zh: '上传txt',
  },
  btnUploadScreenshot: {
    en: 'Upload screenshot',
    ru: 'Загрузить скриншот',
    zh: '上传截图',
  },
  btnMore: {
    en: 'More',
    ru: 'Ещё',
    zh: '更多',
  },
  btnPaid: {
    en: 'I paid',
    ru: 'Я оплатил',
    zh: '已付款',
  },
  btnChangeCurrency: {
    en: 'Change currency',
    ru: 'Изменить валюту',
    zh: '更改币种',
  },
  btnCancel: {
    en: 'Cancel',
    ru: 'Отмена',
    zh: '取消',
  },
  btnDaily: {
    en: 'Daily',
    ru: 'День',
    zh: '日订阅',
  },
  btnWeekly: {
    en: 'Weekly',
    ru: 'Неделя',
    zh: '周订阅',
  },
  btnMonthly: {
    en: 'Monthly',
    ru: 'Месяц',
    zh: '月订阅',
  },
  btnExport: {
    en: 'Export TXT',
    ru: 'Экспорт TXT',
    zh: '导出TXT',
  },
  btnNewCheck: {
    en: 'New check',
    ru: 'Новая проверка',
    zh: '新的验证',
  },
  btnUsers: {
    en: 'Users',
    ru: 'Пользователи',
    zh: '用户',
  },
  btnSubscriptions: {
    en: 'Subscriptions',
    ru: 'Подписки',
    zh: '订阅',
  },
  btnPayments: {
    en: 'Payments',
    ru: 'Платежи',
    zh: '支付',
  },
  btnUsdt: {
    en: 'USDT TRC20',
    ru: 'USDT TRC20',
    zh: 'USDT TRC20',
  },
  btnTon: {
    en: 'TON',
    ru: 'TON',
    zh: 'TON',
  },
  btnTrx: {
    en: 'TRX',
    ru: 'TRX',
    zh: 'TRX',
  },
  btnBtc: {
    en: 'BTC',
    ru: 'BTC',
    zh: 'BTC',
  },
  depositPromptAmount: {
    en: 'Please reply with the amount you would like to deposit in USD.',
    ru: 'Введите сумму пополнения в долларах США.',
    zh: '请输入您想充值的美元金额。',
  },
  invalidAmount: {
    en: 'Invalid amount.',
    ru: 'Неверная сумма.',
    zh: '金额无效。',
  },
  amountRange: {
    en: 'Enter between {min}-{max} USD.',
    ru: 'Введите сумму от {min} до {max} USD.',
    zh: '请输入 {min}-{max} 美元。',
  },
  chooseCurrency: {
    en: 'Choose a currency.',
    ru: 'Выберите валюту.',
    zh: '请选择币种。',
  },
  invoiceDetails: {
    en: 'Send the exact amount to this address. Time left: {minutes} minutes. Amount: {amount} USD Currency: {currency} Invoice: {address}',
    ru: 'Отправьте точную сумму на этот адрес. Осталось: {minutes} минут. Сумма: {amount} USD Валюта: {currency} Инвойс: {address}',
    zh: '请将准确金额发送至此地址。剩余时间：{minutes} 分钟。金额：{amount} 美元 币种：{currency} 地址：{address}',
  },
  invoiceExpired: {
    en: 'Expired. Create a new invoice.',
    ru: 'Счёт истёк. Создайте новый.',
    zh: '已过期。请重新生成。',
  },
  depositConfirmed: {
    en: 'Deposit confirmed. Balance updated.',
    ru: 'Пополнение подтверждено. Баланс обновлён.',
    zh: '充值已确认。余额已更新。',
  },
  depositCancelled: {
    en: 'Deposit cancelled.',
    ru: 'Пополнение отменено.',
    zh: '充值已取消。',
  },
  subscriptionPrompt: {
    en: 'Choose a plan.',
    ru: 'Выберите тариф.',
    zh: '请选择套餐。',
  },
  insufficientBalance: {
    en: 'Insufficient balance.',
    ru: 'Недостаточно средств.',
    zh: '余额不足。',
  },
  subscriptionActivated: {
    en: 'Activated until {date}.',
    ru: 'Активно до {date}.',
    zh: '已激活至 {date}。',
  },
  subscriptionRequired: {
    en: 'Active subscription required.',
    ru: 'Требуется активная подписка.',
    zh: '需要有效订阅。',
  },
  checkPrompt: {
    en: 'Send numbers as text or upload a txt file. You can also upload a screenshot.',
    ru: 'Отправьте номера текстом, txt файлом или скриншотом.',
    zh: '以文本、txt 文件或截图发送号码。',
  },
  maxNumbers: {
    en: 'Maximum 1000 numbers allowed.',
    ru: 'Допустимо максимум 1000 номеров.',
    zh: '最多允许 1000 个号码。',
  },
  processing: {
    en: 'Processing numbers...',
    ru: 'Обработка номеров...',
    zh: '正在处理号码...',
  },
  checkSummary: {
    en: 'Result ready. CLEAN: {clean} | LOCKED: {locked} | BLOCKED: {blocked} | ERROR: {error}',
    ru: 'Готово. ЧИСТЫЕ: {clean} | ЗАБЛОКИРОВАНЫ: {locked} | ЗАПРЕЩЕНЫ: {blocked} | ОШИБКИ: {error}',
    zh: '结果已准备。正常: {clean} | 锁定: {locked} | 封禁: {blocked} | 错误: {error}',
  },
  adminPanel: {
    en: 'Admin panel.',
    ru: 'Панель администратора.',
    zh: '管理员面板。',
  },
  notAllowed: {
    en: 'Not allowed.',
    ru: 'Недоступно.',
    zh: '无权访问。',
  },
  restoreSuccess: {
    en: 'Account restored.',
    ru: 'Аккаунт восстановлен.',
    zh: '账户已恢复。',
  },
  enterText: {
    en: 'Please send the numbers in a text message.',
    ru: 'Отправьте номера текстом.',
    zh: '请以文本发送号码。',
  },
  uploadTxt: {
    en: 'Upload a txt file with the numbers.',
    ru: 'Загрузите txt файл с номерами.',
    zh: '请上传包含号码的 txt 文件。',
  },
  uploadScreenshot: {
    en: 'Upload a screenshot containing the numbers.',
    ru: 'Загрузите скриншот с номерами.',
    zh: '请上传包含号码的截图。',
  },
  invalidInput: {
    en: 'Unsupported input.',
    ru: 'Неподдерживаемый формат.',
    zh: '不支持的输入。',
  },
  payChecking: {
    en: 'Checking payment status...',
    ru: 'Проверяем статус платежа...',
    zh: '正在检查支付状态...',
  },
  paymentPending: {
    en: 'Payment still pending. We will notify you once confirmed.',
    ru: 'Платёж в ожидании. Уведомим при подтверждении.',
    zh: '付款仍在处理中，确认后将通知您。',
  },
  paymentFailed: {
    en: 'Payment verification failed.',
    ru: 'Ошибка проверки платежа.',
    zh: '支付验证失败。',
  },
  exportReady: {
    en: 'Export file is ready.',
    ru: 'Файл готов.',
    zh: '导出文件已准备。',
  },
  rateLimit: {
    en: 'Please wait before starting another check.',
    ru: 'Подождите перед следующей проверкой.',
    zh: '请稍候再进行下一次验证。',
  },
};

export function t(
  lang: SupportedLanguage,
  key: keyof typeof dictionary,
  params: Record<string, string | number> = {}
): string {
  const template = dictionary[key]?.[lang] ?? dictionary[key]?.en ?? key;
  return Object.entries(params).reduce((acc, [param, value]) => acc.split(`{${param}}`).join(String(value)), template);
}
