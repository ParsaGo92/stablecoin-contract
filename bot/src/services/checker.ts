import { CheckResult, CheckResultStatus } from '../models';

function normalizeNumber(raw: string): string | null {
  const digits = raw.replace(/[^0-9+]/g, '');
  if (!digits) {
    return null;
  }

  if (!digits.startsWith('+')) {
    return `+${digits}`;
  }

  return digits;
}

export function extractNumbersFromText(text: string): string[] {
  const regex = /\+?\d{5,15}/g;
  const matches = text.match(regex) ?? [];
  return matches
    .map((match) => normalizeNumber(match))
    .filter((value): value is string => Boolean(value));
}

export function classifyNumber(number: string): CheckResultStatus {
  const lastDigit = number[number.length - 1];
  if (!lastDigit) {
    return 'error';
  }

  if (lastDigit === '5') {
    return 'locked';
  }

  if (parseInt(lastDigit, 10) % 2 === 0) {
    return 'blocked';
  }

  return 'clean';
}

export function stubCheck(numbers: string[]): CheckResult[] {
  return numbers.map((number) => ({
    number,
    status: classifyNumber(number),
    reason: '',
  }));
}
