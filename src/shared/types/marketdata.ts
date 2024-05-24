import { Ping, Quotation, SecurityTradingStatus } from "./common";

/** Тип операции со списком подписок. */
export enum SubscriptionAction {
  /** SUBSCRIPTION_ACTION_UNSPECIFIED - Статус подписки не определён. */
  SUBSCRIPTION_ACTION_UNSPECIFIED = 0,
  /** SUBSCRIPTION_ACTION_SUBSCRIBE - Подписаться. */
  SUBSCRIPTION_ACTION_SUBSCRIBE = 1,
  /** SUBSCRIPTION_ACTION_UNSUBSCRIBE - Отписаться. */
  SUBSCRIPTION_ACTION_UNSUBSCRIBE = 2,
  UNRECOGNIZED = -1,
}

/** Интервал свечи. */
export enum SubscriptionInterval {
  /** SUBSCRIPTION_INTERVAL_UNSPECIFIED - Интервал свечи не определён. */
  SUBSCRIPTION_INTERVAL_UNSPECIFIED = 0,
  /** SUBSCRIPTION_INTERVAL_ONE_MINUTE - Минутные свечи. */
  SUBSCRIPTION_INTERVAL_ONE_MINUTE = 1,
  /** SUBSCRIPTION_INTERVAL_FIVE_MINUTES - Пятиминутные свечи. */
  SUBSCRIPTION_INTERVAL_FIVE_MINUTES = 2,
  UNRECOGNIZED = -1,
}

/** Результат подписки. */
export enum SubscriptionStatus {
  /** SUBSCRIPTION_STATUS_UNSPECIFIED - Статус подписки не определён. */
  SUBSCRIPTION_STATUS_UNSPECIFIED = 0,
  /** SUBSCRIPTION_STATUS_SUCCESS - Успешно. */
  SUBSCRIPTION_STATUS_SUCCESS = 1,
  /** SUBSCRIPTION_STATUS_INSTRUMENT_NOT_FOUND - Инструмент не найден. */
  SUBSCRIPTION_STATUS_INSTRUMENT_NOT_FOUND = 2,
  /** SUBSCRIPTION_STATUS_SUBSCRIPTION_ACTION_IS_INVALID - Некорректный статус подписки, список возможных значений: [SubscriptionAction](https://tinkoff.github.io/investAPI/marketdata#subscriptionaction). */
  SUBSCRIPTION_STATUS_SUBSCRIPTION_ACTION_IS_INVALID = 3,
  /** SUBSCRIPTION_STATUS_DEPTH_IS_INVALID - Некорректная глубина стакана, доступные значения: 1, 10, 20, 30, 40, 50. */
  SUBSCRIPTION_STATUS_DEPTH_IS_INVALID = 4,
  /** SUBSCRIPTION_STATUS_INTERVAL_IS_INVALID - Некорректный интервал свечей, список возможных значений: [SubscriptionInterval](https://tinkoff.github.io/investAPI/marketdata#subscriptioninterval). */
  SUBSCRIPTION_STATUS_INTERVAL_IS_INVALID = 5,
  /** SUBSCRIPTION_STATUS_LIMIT_IS_EXCEEDED - Превышен лимит подписок в рамках стрима, подробнее: [Лимитная политика](https://tinkoff.github.io/investAPI/limits/). */
  SUBSCRIPTION_STATUS_LIMIT_IS_EXCEEDED = 6,
  /** SUBSCRIPTION_STATUS_INTERNAL_ERROR - Внутренняя ошибка сервиса. */
  SUBSCRIPTION_STATUS_INTERNAL_ERROR = 7,
  UNRECOGNIZED = -1,
}

/** Направление сделки. */
export enum TradeDirection {
  /** TRADE_DIRECTION_UNSPECIFIED - Направление сделки не определено. */
  TRADE_DIRECTION_UNSPECIFIED = 0,
  /** TRADE_DIRECTION_BUY - Покупка. */
  TRADE_DIRECTION_BUY = 1,
  /** TRADE_DIRECTION_SELL - Продажа. */
  TRADE_DIRECTION_SELL = 2,
  UNRECOGNIZED = -1,
}

/** Интервал свечей. */
export enum CandleInterval {
  /** CANDLE_INTERVAL_UNSPECIFIED - Интервал не определён. */
  CANDLE_INTERVAL_UNSPECIFIED = 0,
  /** CANDLE_INTERVAL_1_MIN - 1 минута. */
  CANDLE_INTERVAL_1_MIN = 1,
  /** CANDLE_INTERVAL_10_MIN - 10 минут. */
  CANDLE_INTERVAL_10_MIN = 10,
  /** CANDLE_INTERVAL_HOUR - 1 час. */
  CANDLE_INTERVAL_HOUR = 60,
  /** CANDLE_INTERVAL_DAY - 1 день. */
  CANDLE_INTERVAL_DAY = 5,
  UNRECOGNIZED = -1,
}

/** Пакет биржевой информации по подписке. */
export interface MarketDataResponse {
  /** Результат подписки на свечи. */
  subscribeCandlesResponse?: SubscribeCandlesResponse | undefined;
  /** Результат подписки на стаканы. */
  subscribeOrderBookResponse?: SubscribeOrderBookResponse | undefined;
  /** Результат подписки на поток обезличенных сделок. */
  subscribeTradesResponse?: SubscribeTradesResponse | undefined;
  /** Результат подписки на торговые статусы инструментов. */
  subscribeInfoResponse?: SubscribeInfoResponse | undefined;
  /** Свеча. */
  candle?: Candle | undefined;
  /** Сделки. */
  trade?: Trade | undefined;
  /** Стакан. */
  orderbook?: OrderBook | undefined;
  /** Торговый статус. */
  tradingStatus?: TradingStatus | undefined;
  /** Проверка активности стрима. */
  ping?: Ping | undefined;
  /** Результат подписки на последние цены инструментов. */
  subscribeLastPriceResponse?: SubscribeLastPriceResponse | undefined;
  /** Последняя цена. */
  lastPrice?: LastPrice | undefined;
}

/** Результат изменения статус подписки на свечи. */
export interface SubscribeCandlesResponse {
  /** Уникальный идентификатор запроса, подробнее: [tracking_id](https://tinkoff.github.io/investAPI/grpc#tracking-id). */
  trackingId: string;
  /** Массив статусов подписки на свечи. */
  candlesSubscriptions: CandleSubscription[];
}

/** Статус подписки на свечи. */
export interface CandleSubscription {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Интервал свечей. */
  interval: SubscriptionInterval;
  /** Статус подписки. */
  subscriptionStatus: SubscriptionStatus;
}

/** Результат изменения статуса подписки на стаканы. */
export interface SubscribeOrderBookResponse {
  /** Уникальный идентификатор запроса, подробнее: [tracking_id](https://tinkoff.github.io/investAPI/grpc#tracking-id). */
  trackingId: string;
  /** Массив статусов подписки на стаканы. */
  orderBookSubscriptions: OrderBookSubscription[];
}

/** Статус подписки. */
export interface OrderBookSubscription {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Глубина стакана. */
  depth: number;
  /** Статус подписки. */
  subscriptionStatus: SubscriptionStatus;
}

/** Изменение статуса подписки на поток обезличенных сделок. */
export interface SubscribeTradesRequest {
  /** Изменение статуса подписки. */
  subscriptionAction: SubscriptionAction;
  /** Массив инструментов для подписки на поток обезличенных сделок. */
  instruments: TradeInstrument[];
}

/** Результат изменения статуса подписки на торговый статус. */
export interface SubscribeInfoResponse {
  /** Уникальный идентификатор запроса, подробнее: [tracking_id](https://tinkoff.github.io/investAPI/grpc#tracking-id). */
  trackingId: string;
  /** Массив статусов подписки на торговый статус. */
  infoSubscriptions: InfoSubscription[];
}

/** Статус подписки. */
export interface InfoSubscription {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Статус подписки. */
  subscriptionStatus: SubscriptionStatus;
}

/** Запрос подписки на поток обезличенных сделок. */
export interface TradeInstrument {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string;
}

/** Результат изменения статуса подписки на поток обезличенных сделок. */
export interface SubscribeTradesResponse {
  /** Уникальный идентификатор запроса, подробнее: [tracking_id](https://tinkoff.github.io/investAPI/grpc#tracking-id). */
  trackingId: string;
  /** Массив статусов подписки на поток сделок. */
  tradeSubscriptions: TradeSubscription[];
}

/** Статус подписки. */
export interface TradeSubscription {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Статус подписки. */
  subscriptionStatus: SubscriptionStatus;
}

/** Результат изменения статуса подписки на последнюю цену. */
export interface SubscribeLastPriceResponse {
  /** Уникальный идентификатор запроса, подробнее: [tracking_id](https://tinkoff.github.io/investAPI/grpc#tracking-id). */
  trackingId: string;
  /** Массив статусов подписки на последнюю цену. */
  lastPriceSubscriptions: LastPriceSubscription[];
}

/** Статус подписки на последнюю цену. */
export interface LastPriceSubscription {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Статус подписки. */
  subscriptionStatus: SubscriptionStatus;
}


/** Пакет свечей в рамках стрима. */
export interface Candle {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Интервал свечи. */
  interval: SubscriptionInterval;
  /** Цена открытия за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  open?: Quotation;
  /** Максимальная цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  high?: Quotation;
  /** Минимальная цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  low?: Quotation;
  /** Цена закрытия за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  close?: Quotation;
  /** Объём сделок в лотах. */
  volume: number;
  /** Время начала интервала свечи в часовом поясе UTC. */
  time?: Date;
  /** Время последней сделки, вошедшей в свечу в часовом поясе UTC. */
  lastTradeTs?: Date;
}

/** Пакет стаканов в рамках стрима. */
export interface OrderBook {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Глубина стакана. */
  depth: number;
  /** Флаг консистентности стакана. **false** значит не все заявки попали в стакан по причинам сетевых задержек или нарушения порядка доставки. */
  isConsistent: boolean;
  /** Массив предложений. */
  bids: Order[];
  /** Массив спроса. */
  asks: Order[];
  /** Время формирования стакана в часовом поясе UTC по времени биржи. */
  time?: Date;
  /** Верхний лимит цены за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  limitUp?: Quotation;
  /** Нижний лимит цены за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  limitDown?: Quotation;
}

/** Массив предложений/спроса. */
export interface Order {
  /** Цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  price?: Quotation;
  /** Количество в лотах. */
  quantity: number;
}

/** Информация о сделке. */
export interface Trade {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Направление сделки. */
  direction: TradeDirection;
  /** Цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  price?: Quotation;
  /** Количество лотов. */
  quantity: number;
  /** Время сделки в часовом поясе UTC по времени биржи. */
  time?: Date;
}

/** Пакет изменения торгового статуса. */
export interface TradingStatus {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Статус торговли инструментом. */
  tradingStatus: SecurityTradingStatus;
  /** Время изменения торгового статуса в часовом поясе UTC. */
  time?: Date;
  /** Признак доступности выставления лимитной заявки по инструменту. */
  limitOrderAvailableFlag: boolean;
  /** Признак доступности выставления рыночной заявки по инструменту. */
  marketOrderAvailableFlag: boolean;
}

export interface GetCandlesRequest {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string;
  /** Начало запрашиваемого периода в часовом поясе UTC. */
  from?: Date;
  /** Окончание запрашиваемого периода в часовом поясе UTC. */
  to?: Date;
  /** Интервал запрошенных свечей. */
  interval: CandleInterval;
}

/** Информация о свече. */
export interface HistoricCandle {
  /** Цена открытия за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  open?: Quotation;
  /** Максимальная цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  high?: Quotation;
  /** Минимальная цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  low?: Quotation;
  /** Цена закрытия за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  close?: Quotation;
  /** Объём торгов в лотах. */
  volume: number;
  /** Время свечи в часовом поясе UTC. */
  time?: Date;
  /** Признак завершённости свечи. **false** значит, свеча за текущие интервал ещё сформирована не полностью. */
  // isComplete: boolean;
}

/** Запрос получения последних цен. */
export interface GetLastPricesRequest {
  /** Массив figi-идентификаторов инструментов. */
  securitites: { engine: string, market: string, secId: string }[];
}

/** Информация о цене. */
export interface LastPrice {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Последняя цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  price?: Quotation;
  /** Время получения последней цены в часовом поясе UTC по времени биржи. */
  time?: Date;
}