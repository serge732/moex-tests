/**
 * Скрипт для бэктеста робота.
 * npx ts-node examples/js/backtest.ts
 */

import axios from 'axios';
import MockDate from 'mockdate';
import { interval, runRobot } from './robot';
import helpers from './helpers';

main();

async function main() {
  // конфигурируем брокер на диапазон дат
  await configureBroker({
    from: new Date('2022-04-29T12:00:00+03:00'),
    to: new Date('2022-04-29T15:00:00+03:00'),
    candleInterval: interval,
  });

  // итерируем по свечам
  while (await tick()) {
    await runRobot();
  }

  // рассчитываем прибыль;
  await showExpectedYield();
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
  const res = await axios.post('http://localhost:3000/post-order', {
    accountId: 'tick',
    secId: '',
    quantity: 0,
    direction: 0,
    orderType: 0,
    orderId: '',
  });
  if (res.data.message) {
    // устанавливаем глобально текущую дату
    MockDate.set(new Date(res.data.message));
    return true;
  } else {
    return false;
  }
}

async function showExpectedYield() {
  const result = await axios.put('http://localhost:3000/portfolio', { accountId: 'test' });
  const { expectedYield } = result.data;
  console.log(`Прибыль: ${helpers.toNumber(expectedYield)}%`);
  console.log(result.data);
}
