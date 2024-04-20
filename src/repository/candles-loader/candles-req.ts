import { MoexApi } from "api/moex";
import { Debugger } from "debug";
import fs from "fs";
import path from "path";
import { CandleInterval, GetCandlesRequest, HistoricCandle } from "shared/types/marketdata";
import { formatDateUTC } from "shared/utils/date";
import { loadJson, saveJson } from "shared/utils/json";
import { CandlesLoaderOptions } from "./index";
import { DateIterator } from "./date-iterator";

export type CandlesReqParams = GetCandlesRequest & {
  /** Минимальное кол-во свечей в ответе */
  minCount?: number;
}

export class CandlesReq {
  protected candles: HistoricCandle[] = [];
  protected dateIterator: DateIterator;

  constructor(
    protected api: MoexApi,
    protected options: Required<CandlesLoaderOptions>,
    protected params: CandlesReqParams,
    protected debug: Debugger,
  ) {
    this.dateIterator = new DateIterator(params, debug);
  }

  async getCandles() {
    this.debug(`Запрос на загрузку свечей: ${JSON.stringify(this.params)}`);
    this.candles = await this.loadChunk({ useCache: !this.dateIterator.needTodayCandles() });

    this.filterCandlesBy('to');

    while (this.shouldLoadMore()) {
      this.dateIterator.nextChunk();
      const candles = await this.loadChunk({ useCache: true });
      this.candles.unshift(...candles);
    }

    this.filterCandlesBy('from');

    this.debug(`Загрузка свечей завершена: ${this.candles.length}`);
    return this.candles;
  }

  protected async loadChunk({ useCache = true }) {
    if (useCache) {
      const candles = await this.loadChunkFromFile();
      if (candles) return candles;
    }
    const candles = await this.loadChunkFromApi();
    if (useCache) {
      await this.saveChunkToCache(candles);
    }
    return candles;
  }

  protected async loadChunkFromFile(): Promise<HistoricCandle[] | void> {
    const cacheFile = this.getCacheFileName();
    if (fs.existsSync(cacheFile)) {
      this.debug(`Загружаю свечи из файла: ${cacheFile}`);
      const candles: HistoricCandle[] = await loadJson(cacheFile);
      this.debug(`Загружено свечей: ${candles.length}`);
      if (!candles.length) return;
      // Из файла даты приходят строками: '2022-05-06T07:00:00.000Z', переводим в Date
      candles.forEach(candle => candle.time = new Date(candle.time!));
      return candles;
    }
  }

  protected async loadChunkFromApi() {
    const { engine, market, secId, interval } = this.params;
    const { from, to } = this.dateIterator.getCurrentChunkRange();
    this.debug(`Загружаю свечи из API: ${from.toISOString()} - ${to.toISOString()}`);
    const { candles } = await this.api.marketdata.getCandles({ engine, market, secId, interval, from, to });
    this.debug(`Загружено свечей: ${candles.length}`);
    return candles;
  }


  protected async saveChunkToCache(candles: HistoricCandle[]) {
    const cacheFile = this.getCacheFileName();
    this.debug(`Сохраняю свечи (${candles.length}) в файл: ${cacheFile}`);
    await saveJson(cacheFile, candles);
  }

  // eslint-disable-next-line max-statements
  protected shouldLoadMore() {
    // todo: check max iterations
    const { minCount, from } = this.params;
    if (minCount) {
      const res = this.candles.length < minCount;
      res && this.debug(`Сейчас свечей: ${this.candles.length}, а нужно: ${minCount}`);
      return res;
    }
    if (from) {
      const { currentChunkDate } = this.dateIterator;
      const res = currentChunkDate > from;
      res && this.debug([
        `Сейчас свечей: ${this.candles.length}, начиная с ${currentChunkDate.toISOString()},`,
        `а нужно с ${from.toISOString()}`,
      ].join(' '));
      return res;
    }
    throw new Error(`Нужно указать "from" или "minCount"`);
  }

  protected filterCandlesBy(date: 'from' | 'to') {
    const oldLength = this.candles.length;
    const { from } = this.params;
    if (date === 'to') {
      this.candles = this.candles.filter(candle => candle.time! < this.dateIterator.to);
    } else if (from) {
      this.candles = this.candles.filter(candle => candle.time! >= from);
    }
    const newLength = this.candles.length;
    if (newLength !== oldLength) {
      const dateStr = date === 'from' ? from!.toISOString() : this.dateIterator.to.toISOString();
      this.debug(`Фильтрация свечей по ${date} (${dateStr}): ${oldLength} -> ${newLength}`);
    }
  }

  protected getCacheFileName() {
    const { isYearChunk, currentChunkDate } = this.dateIterator;
    const dateStr = formatDateUTC(currentChunkDate, isYearChunk ? 'YYYY' : 'YYYY-MM-DD');
    return path.join(
      this.options.cacheDir,
      'candles',
      this.params.engine,
      this.params.market,
      this.params.secId,
      isYearChunk ? 'day' : candleIntervalToString(this.params.interval),
      `${dateStr}.json`
    );
  }
}

function candleIntervalToString(interval: CandleInterval) {
  return CandleInterval[interval].replace('CANDLE_INTERVAL_', '').toLowerCase();
}