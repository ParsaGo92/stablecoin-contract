import axios from 'axios';
import dayjs from 'dayjs';
import { config } from '../config';
import { InvoiceDocument, InvoiceModel } from '../models';

export type SupportedCurrency = 'USDTTRC20' | 'TON' | 'TRX' | 'BTC';

export interface CreateInvoiceInput {
  userId: string;
  amountUsd: number;
  currency: SupportedCurrency;
}

export interface InvoiceDetails {
  address: string;
  invoiceId: string;
  payCurrency: string;
  status: 'waiting' | 'finished' | 'expired' | 'failed';
  payAmount?: string;
}

export class NowPaymentsClient {
  private readonly apiKey?: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = config.nowPaymentsApiKey;
    this.baseUrl = config.nowPaymentsBaseUrl;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }
    return headers;
  }

  async createInvoice(input: CreateInvoiceInput): Promise<InvoiceDocument> {
    const expiresAt = dayjs().add(30, 'minute').toDate();

    if (!this.apiKey) {
      // Stubbed invoice when API key is absent, useful for local development.
      return InvoiceModel.create({
        userId: input.userId,
        amountUsd: input.amountUsd,
        payCurrency: input.currency,
        status: 'pending',
        invoiceUrl: 'https://nowpayments.io/payment',
        address: `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        expiresAt,
      });
    }

    const response = await axios.post(
      `${this.baseUrl}/invoice`,
      {
        price_amount: input.amountUsd,
        price_currency: 'usd',
        pay_currency: input.currency.toLowerCase(),
        order_id: `${input.userId}-${Date.now()}`,
        order_description: 'Telegram bot deposit',
      },
      { headers: this.headers() }
    );

    const data = response.data;

    return InvoiceModel.create({
      userId: input.userId,
      amountUsd: input.amountUsd,
      payCurrency: input.currency,
      status: 'pending',
      nowpayId: data.id,
      invoiceUrl: data.invoice_url,
      address: data.pay_address,
      expiresAt,
    });
  }

  async getInvoiceStatus(invoice: InvoiceDocument): Promise<InvoiceDetails> {
    if (!this.apiKey || !invoice.nowpayId) {
      // Stub: flip to finished if balance already updated manually
      return {
        address: invoice.address,
        invoiceId: invoice._id.toString(),
        payCurrency: invoice.payCurrency,
        status: invoice.status === 'confirmed' ? 'finished' : invoice.status === 'expired' ? 'expired' : 'waiting',
      };
    }

    const response = await axios.get(`${this.baseUrl}/invoice/${invoice.nowpayId}`, { headers: this.headers() });
    const data = response.data;
    return {
      address: data.pay_address,
      invoiceId: data.id,
      payCurrency: data.pay_currency,
      status: data.payment_status,
      payAmount: data.pay_amount,
    };
  }
}

export const nowPaymentsClient = new NowPaymentsClient();
