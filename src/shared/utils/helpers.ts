/**
 * Хелперы.
 * See: https://tinkoff.github.io/investAPI/faq_custom_types/
 */

import ms, { StringValue } from 'ms';
import { MoneyValue, Quotation } from '../types/common';

export class Helpers {
  static toQuotation(value: number): Quotation {
    const sign = value < 0 ? -1 : 1;
    const absValue = Math.abs(value);
    const units = Math.floor(absValue);
    // Math.round нужен, чтобы не было чисел вида 10000000.00000227
    const nano = Math.round((absValue - units) * 1000000000);
    return {
      units: sign * units,
      nano: sign * nano,
    };
  }

  static toMoneyValue(value: number, currency: string): MoneyValue {
    const { units, nano } = Helpers.toQuotation(value);
    return { units, nano, currency };
  }

  static toMoneyString(value: MoneyValue | undefined) {
    return `${Helpers.toNumber(value)} ${value?.currency}`;
  }

  /**
   * Возвращает число из объекта { units, nano }
   */
  static toNumber<T extends Quotation | MoneyValue | undefined>(value: T) {
    return (value ? value.units + value.nano / 1000000000 : value) as T extends undefined ? undefined : number;
  }

  /**
   * Возвращает интервал времени в формате { from, to } по заданному смещению и базовой дате.
   * Для смещения можно использовать кол-во миллисекунд или строку в формате из https://github.com/vercel/ms
   */
  static fromTo(offset: string | number, base = new Date()) {
    // Не использую StringValue, т.к. с ним больше мороки: нужно импортить при использовании итд.
    const offsetMs = typeof offset === 'string' ? ms(offset as StringValue) : offset;
    const date = new Date(base.valueOf() + offsetMs);
    const [from, to] = offsetMs > 0 ? [base, date] : [date, base];
    return { from, to };
  }
}
