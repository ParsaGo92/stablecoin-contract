import mongoose, { Document, Schema } from 'mongoose';
import { SupportedLanguage } from './i18n';

type SubscriptionStatus = {
  active: boolean;
  expiresAt?: Date | null;
};

export interface UserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tgId: number;
  lang: SupportedLanguage;
  balanceUsd: number;
  subscription: SubscriptionStatus;
  secretKeyHash: string;
  secretKeyIssuedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<SubscriptionStatus>(
  {
    active: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const userSchema = new Schema<UserDocument>(
  {
    tgId: { type: Number, unique: true, index: true, required: true },
    lang: { type: String, enum: ['en', 'ru', 'zh'], default: 'en' },
    balanceUsd: { type: Number, default: 0 },
    subscription: { type: subscriptionSchema, default: () => ({ active: false }) },
    secretKeyHash: { type: String, required: true },
    secretKeyIssuedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);

export type InvoiceStatus = 'pending' | 'confirmed' | 'expired' | 'cancelled';

export interface InvoiceDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  nowpayId?: string;
  amountUsd: number;
  payCurrency: string;
  status: InvoiceStatus;
  invoiceUrl?: string;
  address: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invoiceSchema = new Schema<InvoiceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nowpayId: { type: String },
    amountUsd: { type: Number, required: true },
    payCurrency: { type: String, required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'expired', 'cancelled'], default: 'pending' },
    invoiceUrl: { type: String },
    address: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model<InvoiceDocument>('Invoice', invoiceSchema);

export interface SubscriptionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  plan: 'daily' | 'weekly' | 'monthly';
  price: number;
  startedAt: Date;
  expiresAt: Date;
}

const subscriptionHistorySchema = new Schema<SubscriptionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
    price: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const SubscriptionHistoryModel = mongoose.model<SubscriptionDocument>('Subscription', subscriptionHistorySchema);

export type CheckResultStatus = 'clean' | 'locked' | 'blocked' | 'error';

export interface CheckResult {
  number: string;
  status: CheckResultStatus;
  reason?: string;
}

export interface CheckDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sourceType: 'text' | 'file' | 'screenshot';
  total: number;
  clean: number;
  locked: number;
  blocked: number;
  error: number;
  results: CheckResult[];
  createdAt: Date;
  updatedAt: Date;
}

const checkSchema = new Schema<CheckDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sourceType: { type: String, enum: ['text', 'file', 'screenshot'], required: true },
    total: { type: Number, required: true },
    clean: { type: Number, required: true },
    locked: { type: Number, required: true },
    blocked: { type: Number, required: true },
    error: { type: Number, required: true },
    results: [
      {
        number: { type: String, required: true },
        status: { type: String, enum: ['clean', 'locked', 'blocked', 'error'], required: true },
        reason: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const CheckModel = mongoose.model<CheckDocument>('Check', checkSchema);

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  return mongoose.connect(uri);
}
