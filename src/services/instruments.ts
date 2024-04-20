import { Instrument, InstrumentIdType, InstrumentRequest } from "shared/types/instruments";
import { Broker } from "../broker";
import path from "path";
import fs from "fs";
import { loadJson, saveJson } from "shared/utils/json";
import { SecurityTradingStatus } from "shared/types/common";

export class Instruments {
  /** In-memory кеш для запросов getInstrumentBy() */
  private instrumentCache: Map<string, Instrument> = new Map();

  constructor(private broker: Broker) { }

  private get options() {
    return this.broker.options;
  }

  /**
   * Возвращает данные по инструменту.
   * Если данных в кеше нет, они разово загрузятся.
   */
  async getInstrumentBy(req: InstrumentRequest) {
    const idTypeStr = InstrumentIdType[req.idType].replace('INSTRUMENT_ID_TYPE_', '').toLowerCase();
    const cacheId = [idTypeStr, req.engine, req.market, req.secId, req.classCode].filter(Boolean).join('_');
    const filePath = path.join(this.options.cacheDir, 'instrument', `${cacheId}.json`);
    let instrument: Instrument;
    if (this.instrumentCache.has(cacheId)) {
      instrument = this.instrumentCache.get(cacheId)!;
    } else if (fs.existsSync(filePath)) {
      instrument = await loadJson(filePath);
      this.instrumentCache.set(cacheId, instrument);
    } else {
      const res = await this.broker.api.instruments.getInstrumentBy(req);
      if (!res.instrument) throw new Error(`Нет данных по инструменту: ${cacheId}`);
      instrument = res.instrument;
      instrument.tradingStatus = SecurityTradingStatus.SECURITY_TRADING_STATUS_NORMAL_TRADING;
      instrument.buyAvailableFlag = true;
      instrument.sellAvailableFlag = true;
      instrument.apiTradeAvailableFlag = true;
      await saveJson(filePath, instrument);
      this.instrumentCache.set(cacheId, instrument);
    }
    return { instrument };
  }

}