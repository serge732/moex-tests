import axios from 'axios';
import helpers from './helpers';

const engine = 'stock';
const market = 'shares';
const secId = 'ABRD';
const interval = 60;

async function runRobot() {
  const portfolioResponse = await axios.put('http://localhost:3000/portfolio', {
    accountId: 'test'
  });
  const { positions } = portfolioResponse.data;
  const currentSecPosition = positions.find((position: any) => position.secId === secId);
  const currentSecAvgPositionPrice = currentSecPosition?.averagePositionPrice.units;

  const candlesResponse = await axios.put('http://localhost:3000/candles', {
    engine,
    market,
    secId,
    interval,
    ...helpers.fromTo('-15m')
  });

  const candles = candlesResponse.data;

  const [, curCandle] = candles.slice(-2);
  const curPrice = helpers.toNumber(curCandle.close!);

  if (!currentSecAvgPositionPrice || (currentSecAvgPositionPrice - curPrice!) / currentSecAvgPositionPrice > 0.2) {
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