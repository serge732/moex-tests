import { EventEmitter } from "events";
import { CandleSubscription, InfoSubscription, LastPriceSubscription, MarketDataResponse, OrderBookSubscription, TradeSubscription } from "shared/types/marketdata";
import { Broker } from "../broker";

type Subscriptions = {
  candles: CandleSubscription[],
  orderBook: OrderBookSubscription[],
  trades: TradeSubscription[],
  info: InfoSubscription[],
  lastPrice: LastPriceSubscription[],
}

export class MarketDataStream {
  protected emitter = new EventEmitter();
  protected subscriptions: Subscriptions = createEmptySubscriptions();

  constructor(private broker: Broker) { }

  async emitData() {
    await this.emitCandle();
    await this.emitLastPrice();
    await this.emitOrderBook();
    // todo: emit trades, emit info
  }

  reset() {
    this.subscriptions = createEmptySubscriptions();
  }

  protected async emitCandle() {
    for (const { engine, market, secId, interval } of this.subscriptions.candles) {
      const historicCandle = await this.broker.marketdata.getCurrentCandle(engine, market, secId);
      const candle: NonNullable<MarketDataResponse['candle']> = { engine, market, secId, interval, ...historicCandle };
      this.emitter.emit('data', { candle });
    }
  }

  protected async emitLastPrice() {
    for (const { engine, market, secId } of this.subscriptions.lastPrice) {
      const { close: price, time } = await this.broker.marketdata.getCurrentCandle(engine, market, secId);
      const lastPrice: NonNullable<MarketDataResponse['lastPrice']> = { engine, market, secId, price, time };
      this.emitter.emit('data', { lastPrice });
    }
  }

  protected async emitOrderBook() {
    for (const { engine, market, secId, depth } of this.subscriptions.orderBook) {
      const { high: limitUp, low: limitDown, time } = await this.broker.marketdata.getCurrentCandle(engine, market, secId);
      const orderbook: NonNullable<MarketDataResponse['orderbook']> = {
        engine,
        market,
        secId,
        depth,
        bids: [],
        asks: [],
        limitUp,
        limitDown,
        time,
        isConsistent: true,
      };
      this.emitter.emit('data', { orderbook });
    }
  }
}

function createEmptySubscriptions(): Subscriptions {
  return {
    candles: [],
    orderBook: [],
    trades: [],
    info: [],
    lastPrice: [],
  };
}