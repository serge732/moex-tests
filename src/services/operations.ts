import { Operation, OperationsRequest, PortfolioPosition, PortfolioRequest, PortfolioResponse, PositionsResponse } from "shared/types/operations";
import { Helpers } from "shared/utils/helpers";
import { Broker } from "../broker";

export class Operations {
  private portfolioPositions: PortfolioPosition[] = [];
  private positionsResponse: PositionsResponse = createEmptyPositionsResponse();
  private operations: Operation[] = [];

  constructor(private broker: Broker) { }

  reset() {
    this.portfolioPositions = [];
    this.positionsResponse = createEmptyPositionsResponse();
    this.operations = [];
    this.addToBalance(this.broker.options.initialCapital, 'money');
  }

  async getPortfolio(_: PortfolioRequest) {
    await this.updatePositionsCurrentPrice();
    // иностранная валюта пока не поддержана, считаем только рубли
    const totalAmountCurrencies = this.positionsResponse.money.find(item => item.currency === 'rub');
    const portfolio: PortfolioResponse = {
      totalAmountCurrencies: totalAmountCurrencies || Helpers.toMoneyValue(0, 'rub'),
      totalAmountShares: Helpers.toMoneyValue(this.calcTotalAmount('share'), 'rub'),
      totalAmountBonds: Helpers.toMoneyValue(this.calcTotalAmount('bond'), 'rub'),
      totalAmountEtf: Helpers.toMoneyValue(this.calcTotalAmount('etf'), 'rub'),
      totalAmountFutures: Helpers.toMoneyValue(this.calcTotalAmount('future'), 'rub'),
      expectedYield: Helpers.toQuotation(0),
      positions: this.portfolioPositions,
    };
    portfolio.expectedYield = Helpers.toQuotation(this.calcExpectedYield(portfolio));
    return portfolio;
  }

  async getOperations({ engine, market, secId, state }: OperationsRequest) {
    const operations = this.operations.filter(o => o.secId === secId && o.state === state);
    return { operations };
  }

  pushOperations(operations: Operation[]) {
    this.operations.push(...operations);
  }

  replacePortfolioPosition(position: PortfolioPosition) {
    const curIndex = this.portfolioPositions.findIndex(p => p.secId === position.secId);
    curIndex >= 0
      ? this.portfolioPositions[curIndex] = position
      : this.portfolioPositions.push(position);
  }

  /**
   * Блокируем (разблокируем) деньги в балансе (positionsResponse)
   */
  blockMoney(amount: number) {
    this.addToBalance(-amount, 'money');
    this.addToBalance(amount, 'blocked');
  }

  /**
   * Блокируем (разблокируем) штуки инстумента (positionsResponse)
   */
  blockSecId(engine: string, market: string, secId: string, qty: number) {
    this.addToSecId(engine, market, secId, -qty, 'balance');
    this.addToSecId(engine, market, secId, qty, 'blocked');
  }

  private async updatePositionsCurrentPrice() {
    const securitites = this.portfolioPositions.map(({ engine, market, secId }) => ({
      engine,
      market,
      secId
    }));
    const { lastPrices } = await this.broker.marketdata.getLastPrices({ securitites });
    this.portfolioPositions.forEach(p => {
      const { price } = lastPrices.find(lp =>
        lp.engine === p.engine && lp.market === p.market && lp.secId === p.secId
      ) || {};
      p.currentPrice = Helpers.toMoneyValue(Helpers.toNumber(price) || 0, 'rub');
    });
  }

  private calcTotalAmount(instrumentType: string) {
    return this.portfolioPositions
      .filter(position => position.instrumentType === instrumentType)
      .reduce((acc, position) => {
        const price = Helpers.toNumber(position.currentPrice) || 0;
        const quantity = Helpers.toNumber(position.quantity) || 0;
        return acc + price * quantity;
      }, 0);
  }

  private calcExpectedYield(portfolio: PortfolioResponse) {
    const positions = [];
    if (portfolio.positions?.[0]?.quantity?.units) {
      for (let i = 0; i < portfolio.positions[0].quantity.units; i++) {
        positions.push(portfolio.positions[0].currentPrice);
      }
    }
    const amounts = [
      portfolio.totalAmountCurrencies,
      portfolio.totalAmountBonds,
      portfolio.totalAmountEtf,
      portfolio.totalAmountFutures,
      portfolio.totalAmountShares,
      ...positions
    ].map(amount => Helpers.toNumber(amount) || 0);
    const currentCapital = amounts.reduce((acc, amount) => acc + amount, 0);
    const { initialCapital } = this.broker.options;
    return 100 * (currentCapital - initialCapital) / initialCapital;
  }

  /**
   * Добавляем (вычитаем) штуки инстумента в positionsResponse
   */
  addToSecId(engine: string, market: string, secId: string, qty: number, type: 'balance' | 'blocked') {
    const { securities } = this.positionsResponse;
    let index = securities.findIndex(item => item.secId === secId);
    if (index === -1) {
      securities.push({ engine, market, secId, balance: 0, blocked: 0 });
      index = securities.length - 1;
    }
    const value = securities[index][type];
    const newValue = value + qty;
    if (newValue < 0) throw new Error(`Отрицательный баланс инструмента ${engine}/${market}/${secId}: ${newValue}`);
    securities[index][type] = newValue;
  }

  /**
   * Добавляем (вычитаем) штуки инстумента в positionsResponse
   */
  addToEngineMarketSecId(engine: string, market: string, secId: string, qty: number, type: 'balance' | 'blocked') {
    const { securities } = this.positionsResponse;
    let index = securities.findIndex(item => item.secId === secId);
    if (index === -1) {
      securities.push({ engine, market, secId, balance: 0, blocked: 0 });
      index = securities.length - 1;
    }
    const value = securities[index][type];
    const newValue = value + qty;
    if (newValue < 0) throw new Error(`Отрицательный баланс инструмента ${engine}/${market}/${secId}: ${newValue}`);
    securities[index][type] = newValue;
  }

  /**
   * Добавляем (вычитаем) деньги в positionsResponse
   */
  addToBalance(amount: number, type: 'money' | 'blocked') {
    let index = this.positionsResponse[type].findIndex(item => item.currency === 'rub');
    if (index === -1) {
      this.positionsResponse[type].push({ units: 0, nano: 0, currency: 'rub' });
      index = this.positionsResponse[type].length - 1;
    }
    const value = Helpers.toNumber(this.positionsResponse[type][index]);
    const newValue = Number(value.toFixed(3)) + Number(amount.toFixed(3));
    console.log(type, value, amount, newValue);
    // if (newValue < 0) throw new Error(`Отрицательный баланс (${type}): ${newValue}`);
    if (newValue === 0) {
      this.positionsResponse[type].splice(index, 1);
    } else {
      this.positionsResponse[type][index] = Helpers.toMoneyValue(newValue, 'rub');
    }
  }
}

function createEmptyPositionsResponse(): PositionsResponse {
  return {
    money: [],
    blocked: [],
    securities: [],
    futures: [],
    limitsLoadingInProgress: false,
  };
}