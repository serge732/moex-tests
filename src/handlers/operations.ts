import { RequestHandler, Router } from "express";
import { PortfolioRequest } from "shared/types/operations";
import { Broker } from "../broker";

export class Operations {
  private _router = Router();

  constructor(private broker: Broker) { }

  get router() {
    this._router.put('/portfolio', this.getPortfolio);
    return this._router;
  }

  getPortfolio: RequestHandler<any, any, PortfolioRequest> = async (req, res) => {
    try {
      const portfolio = await this.broker.operations.getPortfolio({
        ...req.body
      });
      res.statusCode = 200;
      res.send(portfolio);
    } catch (error) {
      if (error instanceof Error) {
        res.statusCode = 400;
        res.send(error.message)
      }
    }
  }
}