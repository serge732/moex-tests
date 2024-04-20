import Debug from "debug";
import { CandleInterval, GetCandlesRequest, GetLastPricesRequest, HistoricCandle } from "shared/types/marketdata";
import { Broker } from "../broker";
import { CandlesReq, CandlesReqParams } from "../repository/candles-loader/candles-req";
import { Helpers } from "shared/utils/helpers";

const debug = Debug('marketdata');
const candlesLoaderDebug = Debug('candles-loader');

type DateRange = { from: Date, to: Date };

export class MarketData {
  private candles: Map</*engine+market+secId*/string, HistoricCandle[]> = new Map();
  private candlesFromTo: Map</*engine+market+secId*/string, DateRange> = new Map();

  currentDate = new Date();
  private ticks = 0;

  constructor(private broker: Broker) { }

  private get options() {
    return this.broker.options;
  }

  private get interval() {
    return this.options.candleInterval;
  }

  /**
   * Смещаем дату на интервал свечи.
   */
  tick() {
    const nextDate = this.ticks === 0
      // добавляем к стартовой дате 1 мс. Это дает более ожидаемый результат:
      // текущей свечей будет именно свеча за сегодняшнюю дату
      ? new Date(this.options.from.valueOf() + 1)
      : new Date(this.currentDate.valueOf() + intervalToMs(this.interval));
    if (nextDate < this.options.to) {
      this.currentDate = nextDate;
      debug(`Установлена дата: ${nextDate.toISOString()}`);
      this.ticks++;
      return true;
    } else {
      debug(`Достигнута конечная дата: ${nextDate.toISOString()}`);
      // возможно тут стоит сделать MockDate.reset()
      return false;
    }
  }

  reset() {
    this.assertFinalDateInThePast();
    this.ticks = 0;
    // set new Date
  }

  /**
   * ANCHOR Получение свечей.
   */
  async getCandles({ engine, market, secId, interval, from, to }: GetCandlesRequest) {
    this.assertTickCalled();
    this.assertSameInterval(interval);
    if (!from || !to) throw new Error(`Нужно указать from и to`);
    const newRange = this.getNewRange(engine, market, secId, from, to);
    if (newRange) {
      await this.reloadCandles({ engine, market, secId, ...newRange });
    } else {
      debug('Все запрошенные свечи есть в memory-кеше');
    }
    const candles = this.getFilteredCandles(engine, market, secId, from, to);
    return { candles };
  }

  async getLastPrices(req: GetLastPricesRequest) {
    const currentCandles = await Promise.all(req.securitites.map(security =>
      this.getCurrentCandle(security.engine, security.market, security.secId))
    );
    const lastPrices = currentCandles.map((candle, index) => {
      return {
        engine: req.securitites[index].engine,
        market: req.securitites[index].market,
        secId: req.securitites[index].secId,
        price: candle.close,
        time: candle.time,
      };
    });
    return { lastPrices };
  }

  // --- Для внутреннего использования ---

  async getCurrentPrice(engine: string, market: string, secId: string,) {
    const currentCandle = await this.getCurrentCandle(engine, market, secId);
    return Helpers.toNumber(currentCandle.close!);
  }

  async getCurrentCandle(engine: string, market: string, secId: string,) {
    return this.getCandle(engine, market, secId, 0);
  }

  /**
   * Получить свечу по смещению от текущего момента.
   * offset = 0: текущая свеча
   * offset = -1: предыдущая свеча
   * Если торги не идут, вернется последняя закрытая свеча.
   */
  async getCandle(engine: string, market: string, secId: string, offset: number) {
    // Пока сделано максимально просто, без использования memory-кеша:
    // на каждый запрос идет считывание файлов, а результат также не записывается в memory-кеш.
    // По хорошему нужно сначала посмотреть в memory-кеш, и попробовать взять оттуда (учесть пустоты!).
    // А если пришлось грузить из файлов, то результат подмерджить в memory-кеш
    // (учесть что новых свечей может быть меньше чем уже загруженных)
    const to = this.currentDate;
    const minCount = Math.abs(offset - 1);
    const candlesReq = new CandlesReq(
      this.broker.api,
      this.options,
      { engine, market, secId, minCount, to, interval: this.interval },
      candlesLoaderDebug
    );
    const candles = await candlesReq.getCandles();
    const candle = candles.slice(-minCount)[0];
    if (!candle) throw new Error(`Что-то пошло не так при получении текущей свечи`);
    return candle;
    // const intervalMs = intervalToMs(this.interval);
    // const to = new Date(Date.now() + offset * intervalMs);
    // отступаем от текущей даты, чтобы получить ровно одну свечу
    // const from = new Date(to.valueOf() - intervalMs);
  }

  private async reloadCandles(params: Omit<CandlesReqParams, 'interval'>) {
    const candlesReq = new BacktestCandlesReq(
      this.broker.api,
      this.options,
      { ...params, interval: this.interval },
      candlesLoaderDebug
    );
    const candles = await candlesReq.getCandles();
    this.candles.set(
      `${params.engine}${params.market}${params.secId}`,
      candles
    );
    this.candlesFromTo.set(
      `${params.engine}${params.market}${params.secId}`, candlesReq.getTotalRange()
    );
  }

  private getFilteredCandles(engine: string, market: string, secId: string, from: Date, to: Date) {
    const candles = this.candles.get(`${engine}${market}${secId}`) || [];
    return candles;
  }

  private getNewRange(engine: string, market: string, secId: string, from: Date, to: Date) {
    const loadedRange = this.candlesFromTo.get(`${engine}${market}${secId}`);
    if (!loadedRange) return { from, to };
    if (from < loadedRange.from || to > loadedRange.to) {
      return {
        from: from < loadedRange.from ? from : loadedRange.from,
        to: to > loadedRange.to ? to : loadedRange.to,
      };
    }
  }

  private assertFinalDateInThePast() {
    const todayMidnight = new Date();
    todayMidnight.setUTCHours(0, 0, 0, 0);
    if (this.options.to > todayMidnight) {
      // т.к. candlesLoader не кеширует за сегодня
      throw new Error(`Бэктест на сегодняшних данных запустить нельзя (пока)`);
    }
  }

  private assertTickCalled() {
    if (this.ticks === 0) {
      throw new Error(`Для получения свечей нужно сначала вызвать tick()`);
    }
  }

  private assertSameInterval(interval: CandleInterval) {
    if (interval !== this.options.candleInterval) {
      throw new Error(`interval в запросе не совпадает с установленным для бэктеста`);
    }
  }
}

class BacktestCandlesReq extends CandlesReq {
  protected filterCandlesBy(_: 'from' | 'to') {
    // noop: отключаем фильтрацию, чтобы вернуть максимум загруженных свечей.
    // А отфильтруем на уровне marketdata
  }

  getTotalRange() {
    return this.dateIterator.getTotalRange();
  }
}

function intervalToMs(interval: CandleInterval) {
  switch (interval) {
    case CandleInterval.CANDLE_INTERVAL_1_MIN: return 60 * 1000;
    case CandleInterval.CANDLE_INTERVAL_10_MIN: return 10 * 60 * 1000;
    case CandleInterval.CANDLE_INTERVAL_HOUR: return 60 * 60 * 1000;
    case CandleInterval.CANDLE_INTERVAL_DAY: return 24 * 60 * 60 * 1000;
    default: throw new Error(`Invalid interval`);
  }
}