import Tesseract from 'tesseract.js';
import { extractNumbersFromText } from './checker';

export async function extractNumbersFromImage(buffer: Buffer): Promise<string[]> {
  const { data } = await Tesseract.recognize(buffer, 'eng');
  return extractNumbersFromText(data.text ?? '');
}
