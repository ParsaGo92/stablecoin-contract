# Telegram Number Validation Bot

This package contains the production bot implementation for the multilingual number validation service. It follows the specification in `docs/telegram-bot-design.md` and is written in TypeScript using Telegraf and MongoDB.

## Features

- Multilingual UX (English, Russian, Chinese)
- Secret key account recovery flow
- Crypto deposit invoices (NOWPayments-ready, with local stub)
- Subscription management (daily/weekly/monthly)
- Number validation pipeline for text, txt files, and screenshots (OCR via Tesseract)
- Admin dashboard for monitoring users, subscriptions, and payments
- Strict inline keyboard UI layout

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

   > Run the command inside the `bot` directory. A local stub is used for NOWPayments when `NOWPAYMENTS_API_KEY` is not configured.

2. Copy `.env.example` to `.env` and configure the required environment variables.

3. Build and start the bot:

   ```bash
   npm run build
   npm start
   ```

   For local development you can run `npm run dev`.

## Environment variables

| Variable | Description |
| --- | --- |
| `BOT_TOKEN` | Telegram bot token |
| `MONGODB_URI` | MongoDB connection string |
| `ADMIN_ID` | Telegram user ID with admin privileges |
| `MIN_DEPOSIT_USD` | Minimum deposit amount (USD) |
| `MAX_DEPOSIT_USD` | Maximum deposit amount (USD) |
| `NOWPAYMENTS_API_KEY` | Optional NOWPayments API key |
| `NOWPAYMENTS_API_URL` | Optional override for NOWPayments API base URL |

## Testing NOWPayments locally

When `NOWPAYMENTS_API_KEY` is not provided the bot generates demo invoices with fake addresses. This keeps the UX intact without hitting the live API. Once you configure the API key the same code path will create real invoices and poll their status.

## OCR requirements

OCR is powered by [`tesseract.js`](https://github.com/naptha/tesseract.js). The package ships with WebAssembly binaries, so no native dependencies are needed. For best accuracy ensure screenshots are clear and contain Latin digits.

## Project layout

```
bot/
├── package.json
├── tsconfig.json
├── README.md
└── src
    ├── config.ts
    ├── i18n.ts
    ├── index.ts
    ├── keyboards.ts
    ├── models.ts
    ├── services
    │   ├── checker.ts
    │   ├── ocr.ts
    │   ├── payments.ts
    │   └── secretKey.ts
    └── utils.ts
```

## Running the bot in production

- Deploy the bot as a dedicated Node.js service (PM2, systemd, Docker, etc.).
- Provide HTTPS webhook hosting or run in long-polling mode (default in `startBot`).
- Secure your MongoDB instance and rotate the NOWPayments API key regularly.
- Monitor logs for invoice confirmations and subscription activations.

