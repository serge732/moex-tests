import axios from 'axios';
import helpers from './helpers';

const engine = 'stock';
const market = 'shares';
const secId = 'ABRD';
const interval = 1;

async function runRobot() {
  // загружаем свечи за 5 минут
  const candlesResponse = await axios.put('http://localhost:3000/candles', {
    engine,
    market,
    secId,
    interval,
    ...helpers.fromTo('-15m')
  });

  const candles = candlesResponse.data;

  const [prevCandle, curCandle] = candles.slice(-2);
  const prevPrice = helpers.toNumber(prevCandle.close!);
  const curPrice = helpers.toNumber(curCandle.close!);

  // если цена повысилась, создаем заявку на покупку
  if (curPrice! > prevPrice!) {
    const orderResponse = await axios.post('http://localhost:3000/post-order', {
      accountId: 'test',
      engine,
      market,
      secId,
      quantity: 1,
      direction: 1,
      orderType: 2,
      orderId: Math.random().toString(),
    });
    const order = orderResponse.data;
    console.log(`Cоздана заявка: ${order.secId} ${helpers.toMoneyString(order.initialOrderPrice)}`);
  }
}

export {
  interval,
  runRobot
};