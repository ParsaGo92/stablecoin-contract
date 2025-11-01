# Telegram Number Validation Bot Design Specification

## Overview
This document outlines the architecture and operating procedures for a production-grade Telegram bot that validates phone numbers and manages user subscriptions. The bot is implemented in **Node.js** with a **MongoDB** backend, avoids MTProto sessions entirely, and interfaces with a crypto-friendly payment provider that remains accessible to users in mainland China. All end-user interactions rely exclusively on inline keyboards following a consistent two-buttons-first-row/one-button-second-row layout.

## Goals and Non-Goals
- **Goals**
  - Provide a multilingual onboarding experience in English (EN), Russian (RU), and Chinese (ZH).
  - Maintain secure user profiles with a single-use recovery secret key and encrypted data storage.
  - Enforce a prepaid subscription model that gates the phone number checking feature.
  - Support crypto-based balance top-ups, including options commonly usable in China (e.g., USDT TRC20, TON, TRX, BTC).
  - Deliver a responsive number validation workflow capable of handling text, .txt files, and OCR of screenshots.
  - Offer an admin interface exposing usage statistics and broadcast tools.
- **Non-Goals**
  - Implementing the final production integration with the external number-checking worker (stub provided for later replacement).
  - Supporting payment methods that are likely inaccessible within China (e.g., credit cards, PayPal).
  - Managing MTProto sessions; the bot relies solely on the Telegram Bot API.

## System Architecture
1. **Telegram Bot Layer**
   - Built with `node-telegram-bot-api` or `telegraf` (with webhook support).
   - Uses inline keyboards for all navigation.
   - Stores user language preference, balance, subscription status, and secret key hash in MongoDB.
   - Implements middleware for language resolution and access control (subscription checks, admin checks).

2. **Application Server**
   - Express.js (or Fastify) app that exposes webhook endpoints for Telegram updates and payment provider callbacks.
   - Provides REST endpoints used internally for administrative operations (optional) and health checks.
   - Handles job dispatching to the checker worker (stubbed module `checker-stub.js`).

3. **Database**
   - MongoDB collections (see [Data Models](#data-models)).
   - Indexed by Telegram user ID for fast lookups.
   - Stores hashed secret keys, invoice status, subscription periods, and check history.

4. **Worker / Stub**
   - `checker-stub.js` exports a function that accepts an array of numbers in E.164 format and returns mocked results: numbers ending with even digits -> `blocked`, ending with `5` -> `locked`, otherwise `clean`.
   - Designed to be replaced with the real worker integration in future iterations.

5. **External Services**
   - NOWPayments (or similar provider with Chinese accessibility) for invoice generation, status polling, and webhook notifications.
   - Optional OCR service (e.g., Tesseract via `tesseract.js` for on-device OCR) for screenshot parsing.

## Configuration and Environment
- **Environment Variables**
  - `BOT_TOKEN`: Telegram Bot API token.
  - `MONGODB_URI`: MongoDB connection string.
  - `ADMIN_ID`: Telegram ID of the bot administrator.
  - `NOWPAYMENTS_API_KEY`: API key for the payment provider.
  - `WEBHOOK_URL`: Public HTTPS endpoint for Telegram webhooks.
  - `MIN_DEPOSIT`, `MAX_DEPOSIT`: Numeric bounds for user deposits.
  - Optional: `PORT`, `LOG_LEVEL`, `RATE_LIMIT_SECONDS`.
- Configuration files should never contain secrets; they rely on environment variables and defaults.
- Use HTTPS with valid certificates for all webhook endpoints.

## Localization Strategy
- Store localized strings in JSON files per language (e.g., `locales/en.json`, `locales/ru.json`, `locales/zh.json`).
- Each user record includes a `lang` field updated during onboarding.
- Provide helper functions `t(userLang, key, params)` to fetch translations with interpolation.
- Ensure inline keyboards display button text in the user’s language.

## User Journey

### 1. Language Selection (`/start`)
- Display inline keyboard:
  - Row 1: `English` | `Русский`
  - Row 2: `中文`
- Upon selection, store `lang` in `User` document, send localized "Welcome." message, and transition to the [Home Menu](#home-menu-main-navigation).
- Apply 5-minute auto-delete timer for the selector message.

### 2. Secret Key Issue
- Upon the first user interaction (after language selection), generate a cryptographically secure random string (32 characters) as the secret key.
- Store only its SHA-256 hash (`secretKeyHash`) in MongoDB.
- Show one-time message: `Your secret key is: {key} Keep it safe.` with inline keyboard:
  - Row 1: `I saved it` | `Load key back`
  - Row 2: `Hide`
- Schedule auto-delete after 120 seconds. If the user chooses `Load key back`, prompt for secret key input:
  - Validate by hashing the input and checking existing records.
  - On success: merge balances, subscription, and history from the matched account; inform the user.
  - On failure: reply `Invalid key.`

### 3. Home Menu (Main Navigation)
- Localized message: `Welcome.`
- Inline keyboard:
  - Row 1: `Check` | `Deposit`
  - Row 2: `Buy subscription`
- Re-display this menu after completing key workflows.

### 4. Deposit Workflow
1. **Amount Prompt**
   - Ask for USD amount with message `Please reply with the amount you would like to deposit in USD.`
   - Validate numeric input within `MIN_DEPOSIT`–`MAX_DEPOSIT`.
   - Respond with `Invalid amount.` or `Enter between {min}-{max} USD.` when validation fails.
   - Auto-delete prompt after 5 minutes.

2. **Currency Selection**
   - Page 1 keyboard:
     - Row 1: `USDT TRC20` | `TON`
     - Row 2: `More`
   - Page 2 keyboard:
     - Row 1: `TRX` | `BTC`
     - Row 2: `Back`
   - Persist selected currency in the pending invoice record.

3. **Invoice Generation**
   - Create invoice via payment provider API.
   - Send message:
     ````
     Send the exact amount to this address.
     Time left: {time} minutes.
     Amount: {usd} USD
     Currency: {cur}
     Invoice: {address}
     ````
   - Inline keyboard:
     - Row 1: `I paid` | `Change currency`
     - Row 2: `Cancel`
   - Update the message every minute for 30 minutes to decrement the countdown. After expiration, mark invoice as `expired`, edit the message to `Expired. Create a new invoice.`, and return to the Home menu.

4. **Payment Confirmation**
   - Preferred method: receive webhook/IPN from NOWPayments and verify using HMAC signature.
   - Alternative: when user taps `I paid`, poll the invoice status.
   - On successful confirmation: credit `balanceUsd`, notify `Deposit confirmed. Balance updated.`, and return to Home.
   - Handle partial or incorrect payments by flagging the invoice and notifying admins.

### 5. Subscription Purchase
- Display `Choose a plan.`
- Inline keyboard:
  - Row 1: `Daily` | `Weekly`
  - Row 2: `Monthly`
- Retrieve pricing from configuration (e.g., `$5`, `$25`, `$90`).
- Ensure `balanceUsd >= price`; otherwise respond `Insufficient balance.` and return to Home.
- Deduct balance, create `Subscription` record, set `subscription.active = true`, `subscription.expiresAt = now + duration` (1, 7, or 30 days).
- Confirm activation message `Activated until {date}.` and return to Home.

### 6. Check Flow (Number Validation)

#### Access Control
- Before accepting input, verify active subscription (`subscription.active && expiresAt > now`).
- If inactive: send `Active subscription required.` with keyboard:
  - Row 1: `Buy subscription` | `Deposit`
  - Row 2: `Back`

#### Input Gathering
- Prompt `Send numbers as text or upload a txt file. You can also upload a screenshot.`
- Inline keyboard:
  - Row 1: `Send text` | `Upload txt`
  - Row 2: `Upload screenshot`
- Handle inputs:
  - **Text**: Extract numbers using regex `\+?\d{7,15}`; normalize to E.164 (prepend country codes when missing if possible, default to `+` + digits).
  - **TXT file**: Validate MIME type, parse numbers per line.
  - **Screenshot**: Use OCR (Tesseract) to retrieve numbers; default to English; optionally allow user to specify language if needed.
- Enforce limit of 1000 numbers; respond with `Maximum 1000 numbers allowed.` when exceeded.

#### Processing & Results
- Send interim message `Processing numbers...`.
- Dispatch numbers to `checker-stub.js` (later replaced with real worker). Stub logic returns statuses based on last digit.
- Aggregate counts: CLEAN, LOCKED, BLOCKED, ERROR.
- Respond with formatted summary, e.g.:
  ```
  +8613812345678 clean
  +79990001122 blocked

  Result ready. CLEAN: 1 | LOCKED: 0 | BLOCKED: 1 | ERROR: 0
  ```
- Inline keyboard:
  - Row 1: `Export TXT` | `New check`
  - Row 2: `Back`
- `Export TXT` produces a downloadable `.txt` file listing numbers and statuses.
- Auto-delete check result messages after 24 hours.
- Rate-limit checks to once every 10 seconds per user.

### 7. Admin Panel
- Restricted to `ADMIN_ID`.
- Admin home message: `Admin panel.`
- Keyboard:
  - Row 1: `Users` | `Subscriptions`
  - Row 2: `Payments`
- Actions:
  - **Users**: display total user count and active subscriptions.
  - **Subscriptions**: show counts of active vs expired subscriptions.
  - **Payments**: show counts of pending vs confirmed invoices.
- Commands:
  - `/broadcast <message>`: sends localized announcement to all users (throttle to avoid hitting Telegram limits).
  - Additional admin actions (e.g., manual balance adjustments) can be added with protected commands.

## Data Models
- **User**
  ```ts
  {
    tgId: number,
    lang: 'EN' | 'RU' | 'ZH',
    balanceUsd: number,
    subscription: {
      active: boolean,
      expiresAt: Date | null
    },
    secretKeyHash: string,
    createdAt: Date,
    updatedAt: Date
  }
  ```
- **Invoice**
  ```ts
  {
    userId: ObjectId,
    nowpayId: string,
    amountUsd: number,
    payCurrency: 'USDT_TRC20' | 'TON' | 'TRX' | 'BTC',
    status: 'pending' | 'confirmed' | 'expired' | 'cancelled',
    invoiceUrl: string,
    address: string,
    expiresAt: Date,
    createdAt: Date,
    updatedAt: Date
  }
  ```
- **Subscription**
  ```ts
  {
    userId: ObjectId,
    plan: 'daily' | 'weekly' | 'monthly',
    price: number,
    startedAt: Date,
    expiresAt: Date
  }
  ```
- **Check**
  ```ts
  {
    userId: ObjectId,
    sourceType: 'text' | 'file' | 'screenshot',
    total: number,
    clean: number,
    locked: number,
    blocked: number,
    error: number,
    results: [
      {
        number: string,
        status: 'clean' | 'locked' | 'blocked' | 'error',
        reason: string
      }
    ],
    createdAt: Date,
    expiresAt: Date // for auto-cleanup of old results
  }
  ```

## Message Lifecycle Management
- Language selector, amount prompts, and currency selectors are scheduled for deletion 5 minutes after sending.
- Secret key message deleted after 2 minutes.
- Invoice messages edited every minute; upon timeout they are marked expired and navigation returns to Home.
- Check result messages removed after 24 hours via scheduled job or TTL index.

## Security Considerations
- Hash secret keys with SHA-256; never store plaintext secrets after first display.
- Use HTTPS for webhooks and payment callbacks; verify payment signatures.
- Enforce rate limits (minimum 10 seconds between checks per user) to mitigate abuse.
- Ensure idempotent payment processing: only credit once per invoice ID.
- Maintain robust logging and alerting for payment failures and suspicious activity.
- Store credentials and API keys in environment variables or secret managers.

## Future Enhancements
- Replace stubbed checker with production worker integration via message queue (e.g., RabbitMQ) or REST API.
- Introduce analytics dashboards for admin usage monitoring.
- Expand OCR language options based on user demand.
- Add multi-admin support with role-based access control.

