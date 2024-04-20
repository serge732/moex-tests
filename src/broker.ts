import { MoexApi } from "api/moex";
import Debug from "debug";
import { MarketData } from "services/marketdata";
import { Orders, orderDirectionToString } from "services/orders";
import { BrokerOptions, defaults } from "./options";
import { OrderDirection, OrderExecutionReportStatus, OrderState, OrderType, PostOrderRequest } from "shared/types/orders";
import { MarketDataStream } from "services/marketdata-stream";
import { Helpers } from "shared/utils/helpers";
import { Operations } from "services/operations";
import { Instruments } from "services/instruments";
import { Instrument, InstrumentIdType } from "shared/types/instruments";
import { Operation, OperationState, OperationType, PortfolioPosition } from "shared/types/operations";

const debug = Debug('broker')

export class Broker {
  private lazy: {
    options?: Required<BrokerOptions>
    api?: MoexApi
  } = {};

  instruments: Instruments
  marketdata: MarketData
  marketdataStream: MarketDataStream
  operations: Operations
  orders: Orders

  constructor() {
    this.instruments = new Instruments(this);
    this.marketdata = new MarketData(this);
    this.marketdataStream = new MarketDataStream(this);
    this.operations = new Operations(this);
    this.orders = new Orders(this);
  }

  get options() {
    if (!this.lazy.options) throw new Error(`Брокер не сконфигурирован.`);
    return this.lazy.options;
  }

  get api() {
    if (this.lazy.api) return this.lazy.api;
    this.lazy.api = new MoexApi();
    return this.lazy.api;
  }

  get currentDate() {
    return this.marketdata.currentDate;
  }

  configure(options: BrokerOptions) {
    this.lazy.options = Object.assign({}, defaults, options);
    debug(`Конфигурация свечей:`, this.options.from, this.options.to);
    this.marketdataStream.reset();
    this.marketdata.reset();
    this.operations.reset();
    this.orders.reset();
  }

  /**
   * Переход к следующей исторической свече.
   */
  async tick() {
    const success = this.marketdata.tick();
    if (success) {
      await this.tryExecuteOrders();
      await this.marketdataStream.emitData();
    }
    return success;
  }

  async createOrder(req: PostOrderRequest): Promise<OrderState> {
    const currency = 'rub';
    const lotsRequested = req.quantity;
    const price = req.price
      ? Helpers.toNumber(req.price)
      : await this.marketdata.getCurrentPrice(req.engine, req.market, req.secId);
    // const { lot } = await this.getInstrumentBySecId(req.engine, req.market, req.secId);
    const initialOrderPrice = price * lotsRequested;
    const initialComission = initialOrderPrice * this.options.brokerFee / 100;
    const totalOrderAmount = initialOrderPrice + initialComission;
    const order: OrderState = {
      orderId: req.orderId,
      executionReportStatus: OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_NEW,
      lotsRequested,
      lotsExecuted: 0,
      initialSecurityPrice: Helpers.toMoneyValue(price, currency),
      initialOrderPrice: Helpers.toMoneyValue(initialOrderPrice, currency),
      initialCommission: Helpers.toMoneyValue(initialComission, currency),
      totalOrderAmount: Helpers.toMoneyValue(totalOrderAmount, currency),
      engine: req.engine,
      market: req.market,
      secId: req.secId,
      direction: req.direction,
      orderType: req.orderType,
      stages: [],
      currency,
      orderDate: this.currentDate,
    };
    this.blockBalance(order/* , lot */);
    return order;
  }

  async tryExecuteOrders() {
    const { orders } = await this.orders.getOrders({ accountId: '' });
    debug(`Пробуем исполнить заявки: ${orders.length}`);
    for (const order of orders) {
      const price = await this.isPriceReached(order);
      if (price) await this.executeOrder(order, price);
    }
  }

  private async executeOrder(order: OrderState, price: number) {
    const instrument = await this.getInstrumentBySecId(order.engine, order.market, order.secId);
    this.setOrderExecuted(order/* , instrument */, price);
    this.updateBalance(order/* , instrument.lot */);
    const mainOperation = this.createOrderOperation(order, instrument);
    const comissionOperation = this.createComissionOperation(order, mainOperation);
    this.operations.pushOperations([mainOperation, comissionOperation]);
    const figiOperations = await this.getOperationsBySecId(mainOperation.engine, mainOperation.market, mainOperation.secId);
    const position = this.createPosition(figiOperations/* , instrument */, price);
    this.operations.replacePortfolioPosition(position);
  }

  /**
   * Заблокировать средства при создании заявки.
   */
  protected blockBalance(order: OrderState/* , lot: number */) {
    if (order.direction === OrderDirection.ORDER_DIRECTION_BUY) {
      const totalOrderAmount = Helpers.toNumber(order.totalOrderAmount) || 0;
      this.operations.blockMoney(totalOrderAmount);
    } else {
      this.operations.blockSecId(order.engine, order.market, order.secId, order.lotsRequested/*  * lot */);
    }
  }

  /**
   * Обновляем заблокированные ресурсы после успешного выполнения заявки.
   */
  protected updateBalance(order: OrderState/* , lot: number */) {
    const qty = order.lotsExecuted/*  * lot */;
    if (order.direction === OrderDirection.ORDER_DIRECTION_BUY) {
      const totalOrderAmount = Helpers.toNumber(order.totalOrderAmount) || 0;
      this.operations.addToBalance(-totalOrderAmount, 'blocked');
      this.operations.addToEngineMarketSecId(order.engine, order.market, order.secId, qty, 'balance');
    } else {
      const executedOrderPrice = Helpers.toNumber(order.executedOrderPrice) || 0;
      const executedCommission = Helpers.toNumber(order.executedCommission) || 0;
      this.operations.addToBalance(executedOrderPrice - executedCommission, 'money');
      this.operations.addToEngineMarketSecId(order.engine, order.market, order.secId, -qty, 'blocked');
    }
  }

  /**
   * Достигнута ли цена, указанная в заявке.
   * (для рыночных всегда достигнута)
   */
  private async isPriceReached(order: OrderState) {
    const prevCandle = await this.marketdata.getCandle(order.engine, order.market, order.secId, -1);
    if (!prevCandle) return false;
    const { low, high, close } = prevCandle;
    switch (order.orderType) {
      case OrderType.ORDER_TYPE_MARKET: return Helpers.toNumber(close);
      case OrderType.ORDER_TYPE_LIMIT: {
        const limitPrice = Helpers.toNumber(order.initialSecurityPrice!);
        const lowPrice = Helpers.toNumber(low!);
        const highPrice = Helpers.toNumber(high!);
        // See also: https://www.tradingview.com/pine-script-docs/en/v5/concepts/Strategies.html?highlight=backtesting#broker-emulator
        if (limitPrice >= lowPrice && limitPrice <= highPrice) return limitPrice;
      }
    }
  }

  private setOrderExecuted(order: OrderState/* , instrument: Instrument */, price: number) {
    order.executionReportStatus = OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_FILL;
    order.lotsExecuted = order.lotsRequested;
    const executedOrderPrice = price * order.lotsExecuted/*  * instrument.lot */;
    const executedCommission = executedOrderPrice * this.options.brokerFee / 100;
    const totalOrderAmount = executedOrderPrice + executedCommission;
    order.executedOrderPrice = Helpers.toMoneyValue(executedOrderPrice, order.currency);
    order.executedCommission = Helpers.toMoneyValue(executedCommission, order.currency);
    order.totalOrderAmount = Helpers.toMoneyValue(totalOrderAmount, order.currency);
    order.averagePositionPrice = Helpers.toMoneyValue(price, order.currency);
    logOrderExecuted(order);
  }

  private createOrderOperation(order: OrderState, instrument: Instrument): Operation {
    const isBuy = order.direction === OrderDirection.ORDER_DIRECTION_BUY;
    const operationType = isBuy ? OperationType.OPERATION_TYPE_BUY : OperationType.OPERATION_TYPE_SELL;
    const executedOrderPrice = Helpers.toNumber(order.executedOrderPrice!);
    const payment = isBuy ? -executedOrderPrice : executedOrderPrice;
    return {
      id: order.orderId,
      parentOperationId: '',
      engine: order.engine,
      market: order.market,
      secId: order.secId,
      operationType,
      state: OperationState.OPERATION_STATE_EXECUTED,
      payment: Helpers.toMoneyValue(payment, order.currency),
      price: order.averagePositionPrice,
      currency: order.currency,
      quantity: order.lotsExecuted,
      quantityRest: 0,
      type: getOperationText(operationType),
      instrumentType: instrument.instrumentType,
      trades: [],
      date: this.currentDate,
    };
  }

  private createComissionOperation(order: OrderState, operation: Operation): Operation {
    const payment = -Helpers.toNumber(order.executedCommission!);
    const operationType = OperationType.OPERATION_TYPE_BROKER_FEE;
    return {
      id: `${operation.id}_fee`,
      parentOperationId: operation.id,
      instrumentType: operation.instrumentType,
      engine: order.engine,
      market: order.market,
      secId: order.secId,
      operationType,
      state: OperationState.OPERATION_STATE_EXECUTED,
      payment: Helpers.toMoneyValue(payment, order.currency),
      price: Helpers.toMoneyValue(0, order.currency),
      currency: order.currency,
      quantity: 0,
      quantityRest: 0,
      type: getOperationText(operationType),
      trades: [],
      date: operation.date,
    };
  }

  private createPosition(operations: Operation[]/* , instrument: Instrument */, price: number): PortfolioPosition {
    const qtyOperations = operations.filter(o => o.quantity > 0);
    const { sellLots, quantityLots } = calcPositionLots(qtyOperations);
    const quantity = quantityLots/*  * instrument.lot */;
    const totalAmountFilo = calcTotalAmount(qtyOperations, sellLots, 'filo');
    const totalAmountFifo = calcTotalAmount(qtyOperations, sellLots, 'fifo');
    const averagePriceFilo = quantity > 0 ? totalAmountFilo / quantity : 0;
    const averagePriceFifo = quantity > 0 ? totalAmountFifo / quantity : 0;
    return {
      engine: operations[0].engine,
      market: operations[0].market,
      secId: operations[0].secId,
      instrumentType: operations[0].instrumentType,
      quantityLots: Helpers.toQuotation(quantityLots),
      quantity: Helpers.toQuotation(quantity),
      currentPrice: Helpers.toMoneyValue(price, operations[0].currency),
      averagePositionPrice: Helpers.toMoneyValue(averagePriceFilo, operations[0].currency),
      averagePositionPriceFifo: Helpers.toMoneyValue(averagePriceFifo, operations[0].currency),
    };
  }

  private async getInstrumentBySecId(engine: string, market: string, secId: string) {
    const { instrument } = await this.instruments.getInstrumentBy({
      idType: InstrumentIdType.INSTRUMENT_ID_TYPE_SECID,
      classCode: '',
      engine,
      market,
      secId
    });
    if (!instrument) throw new Error(`Нет данных по инструменту: ${secId}`);
    return instrument;
  }

  private async getOperationsBySecId(engine: string, market: string, secId: string) {
    const { operations } = await this.operations.getOperations({
      engine,
      market,
      secId,
      accountId: '',
      state: OperationState.OPERATION_STATE_EXECUTED,
    });
    return operations;
  }
}

function calcPositionLots(operations: Operation[]) {
  const res = { sellLots: 0, buyLots: 0, quantityLots: 0 };
  operations.forEach(o => {
    if (o.operationType === OperationType.OPERATION_TYPE_SELL) {
      res.sellLots += o.quantity;
    } else {
      res.buyLots += o.quantity;
    }
  });
  res.quantityLots = res.buyLots - res.sellLots;
  return res;
}

/**
 * Расчет суммарной стоимости по операциям:
 * - fifo: первым продается то, что было куплено первым
 * - filo: первым продается то, что было куплено последним
 */
function calcTotalAmount(operations: Operation[], selledLots: number, type: 'fifo' | 'filo') {
  if (type === 'filo') operations = operations.reverse();
  return operations
    .filter(o => o.operationType === OperationType.OPERATION_TYPE_BUY)
    .reduce((acc, o) => {
      selledLots -= o.quantity;
      // todo: если была продана только часть заявки, то тут не очень верно
      return selledLots < 0 ? acc + Math.abs(Helpers.toNumber(o.payment!)) : acc;
    }, 0);
}

function getOperationText(operationType: OperationType) {
  switch (operationType) {
    case OperationType.OPERATION_TYPE_BUY: return 'Покупка ЦБ';
    case OperationType.OPERATION_TYPE_SELL: return 'Продажа ЦБ';
    case OperationType.OPERATION_TYPE_BROKER_FEE: return 'Удержание комиссии за операцию';
    default: return '';
  }
}

function logOrderExecuted({ engine, market, secId, direction, lotsExecuted, executedOrderPrice }: OrderState) {
  debug([
    `Заявка исполнена:`,
    orderDirectionToString(direction),
    engine,
    market,
    secId,
    `${lotsExecuted} lot(s)`,
    Helpers.toMoneyString(executedOrderPrice),
  ].join(' '));
}