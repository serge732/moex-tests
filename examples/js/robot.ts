import axios from 'axios';
import helpers from './helpers';

const engine = 'stock';
const market = 'shares';
const secId = 'SMLT';
const from = '2023-09-01T10:30:00';
const to = '2024-05-31T18:00:00';
const interval = 24;
export const operations: any = [];

async function runRobot() {
  try {
    const portfolioResponse = await axios.put(
      'http://localhost:3000/portfolio',
      {
        accountId: 'test'
      }
    );
    const { positions } = portfolioResponse.data;
    const curSecPosition = positions.find((position: any) => position.secId === secId);
    const curSecPositionQuantity = helpers.toNumber(curSecPosition?.quantity);
    const curSecAvgPositionPrice = helpers.toNumber(curSecPosition?.averagePositionPrice);

    const candlesResponse = await axios.put(
      'http://localhost:3000/candles',
      {
        engine,
        market,
        secId,
        interval,
        ...helpers.fromTo('-1w')
      }
    );
    const candles = candlesResponse.data;
    const [lastCandle] = candles.slice(-1);
    candles.forEach((candl: any) => operations.push([, candl.end, helpers.toNumber(candl.close)]))
    const lastPrice = helpers.toNumber(lastCandle?.close);

    if (lastPrice) {
      const diff = (curSecAvgPositionPrice || 0) - lastPrice;
      const diffRel = Number((diff / (curSecAvgPositionPrice || lastPrice)).toFixed(3));
      console.log(
        'Средняя цена позиции: ', curSecAvgPositionPrice || 0,
        '\nПоследняя цена: ', lastPrice
      );
      if (curSecAvgPositionPrice) {
        console.log('Отклонение: ', -diffRel);
      }
      let direction;
      let quantity;
      if (!curSecAvgPositionPrice || diffRel >= 0.07) {
        direction = 1;
        quantity = 1;
      }
      if (curSecAvgPositionPrice && (diffRel <= -0.05)) {
        direction = 2;
        quantity = curSecPositionQuantity;
      }
      if (direction) {
        try {
          const orderResponse = await axios.post(
            'http://localhost:3000/post-order',
            {
              accountId: 'test',
              engine,
              market,
              secId,
              price: lastCandle?.close,
              quantity,
              direction,
              orderType: 2,
              orderId: Math.random().toString(),
            }
          );
          const order = orderResponse.data;
          console.log(
            `Cоздана заявка ${direction === 1 ? 'На покупку' : 'На продажу'}: 
          ${order.secId} ${helpers.toMoneyString(order.initialOrderPrice)}`
          );
          const operation = Number(helpers.toMoneyString(order.initialOrderPrice).split(' ')[0]);
          operations.push(direction === 1
            ? [operation, lastCandle.end, helpers.toNumber(lastCandle.close)]
            : [-operation, lastCandle.end, helpers.toNumber(lastCandle.close), curSecPositionQuantity]);
        } catch (error) {
          // console.log((error as any).response);
        }
      }
    }
  } catch (error) {
    // console.log((error as any).response);
  }
}

export {
  engine,
  market,
  secId,
  from,
  to,
  interval,
  runRobot
};