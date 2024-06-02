/**
 * Скрипт для бэктеста робота.
 * npx ts-node examples/js/backtest.ts
 */

import axios, { isAxiosError } from 'axios';
import fs from 'fs';
import MockDate from 'mockdate';
import { from, interval, operations, runRobot, to } from './robot';

main();

async function main() {
  // конфигурируем брокер на диапазон дат
  await configureBroker({
    from: new Date(from),
    to: new Date(to),
    candleInterval: interval,
  });

  // итерируем по свечам
  while (await tick()) {
    await runRobot();
  }

  // рассчитываем прибыль;
  await showPortfolio();
}

async function configureBroker(config: unknown) {
  await axios.post('http://localhost:3000/post-order', {
    accountId: 'config',
    secId: JSON.stringify(config),
    quantity: 0,
    direction: 0,
    orderType: 0,
    orderId: '',
  });
}

async function tick() {
  try {
    const res = await axios.post(
      'http://localhost:3000/post-order',
      {
        accountId: 'tick',
        secId: '',
        quantity: 0,
        direction: 0,
        orderType: 0,
        orderId: '',
      }
    );
    if (res.data.message) {
      // устанавливаем глобально текущую дату
      console.log('\n', res.data.message);
      MockDate.set(new Date(res.data.message));
      return true;
    } else {
      return false;
    }
  } catch (error) {
    if (isAxiosError(error)) {
      console.log(error.response?.data)
    }
  }
}

async function showPortfolio() {
  const result = await axios.put('http://localhost:3000/portfolio', { accountId: 'test' });
  const { positions, ...portfolio } = result.data;
  console.log('\n\nПортфолио ', portfolio);
  console.log('Позиции ', positions);
  await fs.promises.writeFile('dates', operations
    .map(([, v]: any) => v)
    .join('\n'));
  await fs.promises.writeFile('buy', operations
    .map(([v,]: any) => Number(v) > 0 ? String(v).split('.').join(',') : '')
    .join('\n'));
  await fs.promises.writeFile('sell', operations
    .map(([v, , , q]: any) => Number(v) < 0 ? String(-v / q).split('.').join(',') : '')
    .join('\n'));
  await fs.promises.writeFile('candles', operations
    .map(([, , v]: any) => String(v).split('.').join(','))
    .join('\n'));
}
