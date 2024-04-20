import { MoneyValue, Quotation } from "./common";

/** Направление операции */
export enum OrderDirection {
  /** ORDER_DIRECTION_UNSPECIFIED - Значение не указано */
  ORDER_DIRECTION_UNSPECIFIED = 0,
  /** ORDER_DIRECTION_BUY - Покупка */
  ORDER_DIRECTION_BUY = 1,
  /** ORDER_DIRECTION_SELL - Продажа */
  ORDER_DIRECTION_SELL = 2,
  UNRECOGNIZED = -1,
}

/** Тип заявки */
export enum OrderType {
  /** ORDER_TYPE_UNSPECIFIED - Значение не указано */
  ORDER_TYPE_UNSPECIFIED = 0,
  /** ORDER_TYPE_LIMIT - Лимитная */
  ORDER_TYPE_LIMIT = 1,
  /** ORDER_TYPE_MARKET - Рыночная */
  ORDER_TYPE_MARKET = 2,
  UNRECOGNIZED = -1,
}

/** Текущий статус заявки (поручения) */
export enum OrderExecutionReportStatus {
  EXECUTION_REPORT_STATUS_UNSPECIFIED = 0,
  /** EXECUTION_REPORT_STATUS_FILL - Исполнена */
  EXECUTION_REPORT_STATUS_FILL = 1,
  /** EXECUTION_REPORT_STATUS_REJECTED - Отклонена */
  EXECUTION_REPORT_STATUS_REJECTED = 2,
  /** EXECUTION_REPORT_STATUS_CANCELLED - Отменена пользователем */
  EXECUTION_REPORT_STATUS_CANCELLED = 3,
  /** EXECUTION_REPORT_STATUS_NEW - Новая */
  EXECUTION_REPORT_STATUS_NEW = 4,
  /** EXECUTION_REPORT_STATUS_PARTIALLYFILL - Частично исполнена */
  EXECUTION_REPORT_STATUS_PARTIALLYFILL = 5,
  UNRECOGNIZED = -1,
}

/** Запрос выставления торгового поручения. */
export interface PostOrderRequest {
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Количество лотов. */
  quantity: number;
  /** Цена одного инструмента. Для получения стоимости лота требуется умножить на лотность инструмента. */
  price?: Quotation;
  /** Направление операции. */
  direction: OrderDirection;
  /** Номер счёта. */
  accountId: string;
  /** Тип заявки. */
  orderType: OrderType;
  /** Идентификатор запроса выставления поручения для целей идемпотентности. Максимальная длина 36 символов. */
  orderId: string;
}

/** Информация о выставлении поручения. */
export interface PostOrderResponse {
  /** Идентификатор заявки. */
  orderId: string;
  /** Текущий статус заявки. */
  executionReportStatus: OrderExecutionReportStatus;
  /** Запрошено лотов. */
  lotsRequested: number;
  /** Исполнено лотов. */
  lotsExecuted: number;
  /** Начальная цена заявки. Произведение количества запрошенных лотов на цену. */
  initialOrderPrice?: MoneyValue;
  /** Исполненная цена заявки. Произведение средней цены покупки на количество лотов. */
  executedOrderPrice?: MoneyValue;
  /** Итоговая стоимость заявки, включающая все комиссии. */
  totalOrderAmount?: MoneyValue;
  /** Начальная комиссия. Комиссия рассчитанная при выставлении заявки. */
  initialCommission?: MoneyValue;
  /** Фактическая комиссия по итогам исполнения заявки. */
  executedCommission?: MoneyValue;
  /** Значение НКД (накопленного купонного дохода) на дату. Подробнее: [НКД при выставлении торговых поручений](https://tinkoff.github.io/investAPI/head-orders#coupon) */
  aciValue?: MoneyValue;
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Направление сделки. */
  direction: OrderDirection;
  /** Начальная цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  initialSecurityPrice?: MoneyValue;
  /** Тип заявки. */
  orderType: OrderType;
  /** Дополнительные данные об исполнении заявки. */
  message: string;
  /** Начальная цена заявки в пунктах (для фьючерсов). */
  initialOrderPricePt?: Quotation;
}

/** Запрос получения списка активных торговых поручений. */
export interface GetOrdersRequest {
  /** Номер счёта. */
  accountId: string;
}

/** Информация о торговом поручении. */
export interface OrderState {
  /** Идентификатор заявки. */
  orderId: string;
  /** Текущий статус заявки. */
  executionReportStatus: OrderExecutionReportStatus;
  /** Запрошено лотов. */
  lotsRequested: number;
  /** Исполнено лотов. */
  lotsExecuted: number;
  /** Начальная цена заявки. Произведение количества запрошенных лотов на цену. */
  initialOrderPrice?: MoneyValue;
  /** Исполненная цена заявки. Произведение средней цены покупки на количество лотов. */
  executedOrderPrice?: MoneyValue;
  /** Итоговая стоимость заявки, включающая все комиссии. */
  totalOrderAmount?: MoneyValue;
  /** Средняя цена позиции по сделке. */
  averagePositionPrice?: MoneyValue;
  /** Начальная комиссия. Комиссия, рассчитанная на момент подачи заявки. */
  initialCommission?: MoneyValue;
  /** Фактическая комиссия по итогам исполнения заявки. */
  executedCommission?: MoneyValue;
  /** Торговая система */
  engine: string;
  /** Рынок */
  market: string;
  /** Идентификатор инструмента */
  secId: string
  /** Направление заявки. */
  direction: OrderDirection;
  /** Начальная цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента. */
  initialSecurityPrice?: MoneyValue;
  /** Стадии выполнения заявки. */
  stages: OrderStage[];
  /** Сервисная комиссия. */
  serviceCommission?: MoneyValue;
  /** Валюта заявки. */
  currency: string;
  /** Тип заявки. */
  orderType: OrderType;
  /** Дата и время выставления заявки в часовом поясе UTC. */
  orderDate?: Date;
}

/** Сделки в рамках торгового поручения. */
export interface OrderStage {
  /** Цена за 1 инструмент. Для получения стоимости лота требуется умножить на лотность инструмента.. */
  price?: MoneyValue;
  /** Количество лотов. */
  quantity: number;
  /** Идентификатор торговой операции. */
  tradeId: string;
}