import ms, { StringValue } from 'ms';
import { MoneyValue, Quotation } from 'shared/types/common';

function toNumber<T extends Quotation | MoneyValue | undefined>(value: T) {
  return (value ? value.units + value.nano / 1000000000 : value) as T extends undefined ? undefined : number;
}

function toMoneyString(value: MoneyValue | undefined) {
  return `${toNumber(value)} ${value?.currency}`;
}

function fromTo(offset: string | number, base = new Date()) {
  // Не использую StringValue, т.к. с ним больше мороки: нужно импортить при использовании итд.
  const offsetMs = typeof offset === 'string' ? ms(offset as StringValue) : offset;
  const date = new Date(base.valueOf() + offsetMs);
  const [from, to] = offsetMs > 0 ? [base, date] : [date, base];
  return { from, to };
}

export default {
  toNumber,
  toMoneyString,
  fromTo
}