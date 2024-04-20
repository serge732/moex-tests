import { Quotation, SecurityTradingStatus } from "./common";

/** Тип идентификатора инструмента. Подробнее об идентификации инструментов: [Идентификация инструментов](https://tinkoff.github.io/investAPI/faq_identification/) */
export enum InstrumentIdType {
  /** INSTRUMENT_ID_UNSPECIFIED - Значение не определено. */
  INSTRUMENT_ID_UNSPECIFIED = 0,
  /** INSTRUMENT_ID_TYPE_FIGI - Figi. */
  INSTRUMENT_ID_TYPE_ENGINE = 1,
  /** INSTRUMENT_ID_TYPE_FIGI - Figi. */
  INSTRUMENT_ID_TYPE_MARKET = 2,
  /** INSTRUMENT_ID_TYPE_FIGI - Figi. */
  INSTRUMENT_ID_TYPE_SECID = 3,
  /** INSTRUMENT_ID_TYPE_TICKER - Ticker. */
  INSTRUMENT_ID_TYPE_TICKER = 4,
  /** INSTRUMENT_ID_TYPE_UID - Уникальный идентификатор. */
  INSTRUMENT_ID_TYPE_UID = 5,
  UNRECOGNIZED = -1,
}

/** Реальная площадка исполнения расчётов. */
export enum RealExchange {
  /** REAL_EXCHANGE_UNSPECIFIED - Тип не определён. */
  REAL_EXCHANGE_UNSPECIFIED = 0,
  /** REAL_EXCHANGE_MOEX - Московская биржа. */
  REAL_EXCHANGE_MOEX = 1,
  /** REAL_EXCHANGE_RTS - Санкт-Петербургская биржа. */
  REAL_EXCHANGE_RTS = 2,
  /** REAL_EXCHANGE_OTC - Внебиржевой инструмент. */
  REAL_EXCHANGE_OTC = 3,
  UNRECOGNIZED = -1,
}

/** Запрос получения инструмента по идентификатору. */
export interface InstrumentRequest {
  /** Тип идентификатора инструмента. Возможные значения: figi, ticker. Подробнее об идентификации инструментов: [Идентификация инструментов](https://tinkoff.github.io/investAPI/faq_identification/) */
  idType: InstrumentIdType;
  /** Идентификатор class_code. Обязателен при id_type = ticker. */
  classCode: string;
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
}

/** Данные по инструменту. */
export interface InstrumentResponse {
  /** Основная информация об инструменте. */
  instrument?: Instrument;
}

/** Объект передачи основной информации об инструменте. */
export interface Instrument {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Тикер инструмента. */
  ticker: string;
  /** Класс-код инструмента. */
  classCode: string;
  /** Isin-идентификатор инструмента. */
  isin: string;
  /** Лотность инструмента. Возможно совершение операций только на количества ценной бумаги, кратные параметру *lot*. Подробнее: [лот](https://tinkoff.github.io/investAPI/glossary#lot) */
  lot: number;
  /** Валюта расчётов. */
  currency: string;
  /** Коэффициент ставки риска длинной позиции по инструменту. */
  klong?: Quotation;
  /** Коэффициент ставки риска короткой позиции по инструменту. */
  kshort?: Quotation;
  /** Ставка риска минимальной маржи в лонг. Подробнее: [ставка риска в лонг](https://help.tinkoff.ru/margin-trade/long/risk-rate/) */
  dlong?: Quotation;
  /** Ставка риска минимальной маржи в шорт. Подробнее: [ставка риска в шорт](https://help.tinkoff.ru/margin-trade/short/risk-rate/) */
  dshort?: Quotation;
  /** Ставка риска начальной маржи в лонг. Подробнее: [ставка риска в лонг](https://help.tinkoff.ru/margin-trade/long/risk-rate/) */
  dlongMin?: Quotation;
  /** Ставка риска начальной маржи в шорт. Подробнее: [ставка риска в шорт](https://help.tinkoff.ru/margin-trade/short/risk-rate/) */
  dshortMin?: Quotation;
  /** Признак доступности для операций в шорт. */
  shortEnabledFlag: boolean;
  /** Название инструмента. */
  name: string;
  /** Торговая площадка. */
  exchange: string;
  /** Код страны риска, т.е. страны, в которой компания ведёт основной бизнес. */
  countryOfRisk: string;
  /** Наименование страны риска, т.е. страны, в которой компания ведёт основной бизнес. */
  countryOfRiskName: string;
  /** Тип инструмента. */
  instrumentType: string;
  /** Текущий режим торгов инструмента. */
  tradingStatus: SecurityTradingStatus;
  /** Признак внебиржевой ценной бумаги. */
  otcFlag: boolean;
  /** Признак доступности для покупки. */
  buyAvailableFlag: boolean;
  /** Признак доступности для продажи. */
  sellAvailableFlag: boolean;
  /** Шаг цены. */
  minPriceIncrement?: Quotation;
  /** Признак доступности торгов через API. */
  apiTradeAvailableFlag: boolean;
  /** Уникальный идентификатор инструмента. */
  uid: string;
  /** Реальная площадка исполнения расчётов. */
  realExchange: RealExchange;
}