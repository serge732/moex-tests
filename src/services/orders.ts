import Debug from "debug";
import { GetOrdersRequest, OrderDirection, OrderExecutionReportStatus, OrderState, PostOrderRequest, PostOrderResponse } from "shared/types/orders";
import { Broker } from "../broker";
import { Helpers } from "shared/utils/helpers";

const debug = Debug('orders');

export class Orders {
  private orders: OrderState[] = [];

  constructor(private broker: Broker) { }

  reset() {
    this.orders = [];
  }

  async getOrders(_: GetOrdersRequest) {
    const statuses = [
      OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_NEW,
      OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_PARTIALLYFILL,
    ];
    const orders = this.orders.filter(order => statuses.includes(order.executionReportStatus));
    return { orders };
  }

  async postOrder(req: PostOrderRequest): Promise<PostOrderResponse> {
    const systemOrder = await this.handleSystemOrder(req);
    if (systemOrder) return systemOrder;
    const order = this.getExistingOrder(req.orderId) || await this.createOrder(req);
    return {
      orderId: order.orderId,
      executionReportStatus: order.executionReportStatus,
      lotsRequested: order.lotsRequested,
      lotsExecuted: order.lotsExecuted,
      initialOrderPrice: order.initialOrderPrice,
      initialSecurityPrice: order.initialSecurityPrice,
      initialCommission: order.initialCommission,
      totalOrderAmount: order.totalOrderAmount,
      engine: order.engine,
      market: order.market,
      secId: order.secId,
      direction: order.direction,
      orderType: order.orderType,
      message: '',
    };
  }

  private getExistingOrder(orderId: string) {
    return this.orders.find(o => o.orderId === orderId);
  }

  private async createOrder(req: PostOrderRequest) {
    const order = await this.broker.createOrder(req);
    this.orders.push(order);
    logOrderCreated(order);
    return order;
  }

  // eslint-disable-next-line max-statements
  private async handleSystemOrder(req: PostOrderRequest) {
    if (req.accountId === 'config') {
      const config = JSON.parse(req.secId);
      config.from = new Date(config.from);
      config.to = new Date(config.to);
      // config.token = ctx.metadata.get('Authorization')?.replace('Bearer ', '') || '';
      this.broker.configure(config);
      return createSystemOrderResponse(req);
    }
    if (req.accountId === 'tick') {
      const success = await this.broker.tick();
      const order = createSystemOrderResponse(req);
      order.message = success ? this.broker.marketdata.currentDate.toISOString() : '';
      return order;
    }
  }
}

export function orderDirectionToString(direction: OrderDirection) {
  return OrderDirection[direction].replace('ORDER_DIRECTION_', '').toLowerCase();
}

function logOrderCreated({ engine, market, secId, direction, lotsRequested, initialOrderPrice }: OrderState) {
  debug([
    `Заявка создана:`,
    orderDirectionToString(direction),
    engine,
    market,
    secId,
    `${lotsRequested} lot(s)`,
    Helpers.toMoneyString(initialOrderPrice),
  ].join(' '));
}

function createSystemOrderResponse(req: PostOrderRequest) {
  return {
    orderId: '',
    executionReportStatus: OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_NEW,
    lotsRequested: 0,
    lotsExecuted: 0,
    engine: '',
    market: '',
    secId: '',
    direction: req.direction,
    orderType: req.orderType,
    message: ''
  };
}