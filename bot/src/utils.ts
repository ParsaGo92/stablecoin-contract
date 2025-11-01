import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

type DurationInput = 'daily' | 'weekly' | 'monthly';

export function calculateExpiry(plan: DurationInput): dayjs.Dayjs {
  const now = dayjs();
  switch (plan) {
    case 'daily':
      return now.add(1, 'day');
    case 'weekly':
      return now.add(7, 'day');
    case 'monthly':
    default:
      return now.add(30, 'day');
  }
}

export function formatDate(date: Date | string): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm');
}

export function formatCheckResults(results: { number: string; status: string; reason?: string }[]): string {
  return results.map((result) => `${result.number} ${result.status}${result.reason ? ` ${result.reason}` : ''}`).join('\n');
}
