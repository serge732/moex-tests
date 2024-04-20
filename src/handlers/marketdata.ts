import { RequestHandler, Router } from "express";
import { GetCandlesRequest } from "shared/types/marketdata";
import { Broker } from "../broker";

export class MarketData {
  private _router = Router();

  constructor(private broker: Broker) { }

  get router() {
    this._router.put('/candles', this.getCandles);
    return this._router;
  }

  private getCandles: RequestHandler<any, any, GetCandlesRequest> = async (req, res) => {
    try {
      const { candles } = await this.broker.marketdata.getCandles({
        ...req.body
      });
      res.statusCode = 200;
      res.send(candles);
    } catch (error) {
      if (error instanceof Error) {
        res.statusCode = 400;
        res.send(error.message)
      }
    }
  }
}