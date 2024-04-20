import { RequestHandler, Router } from "express";
import { PostOrderRequest } from "shared/types/orders";
import { Broker } from "../broker";

export class Orders {
  private _router = Router();

  constructor(private broker: Broker) { }

  get router() {
    this._router.post('/post-order', this.postOrder);
    return this._router;
  }

  private postOrder: RequestHandler<any, any, PostOrderRequest> = async (req, res) => {
    try {
      const response = await this.broker.orders.postOrder({
        ...req.body
      });
      res.statusCode = 200;
      res.send(response);
    } catch (error) {
      if (error instanceof Error) {
        res.statusCode = 400;
        res.send(error.message);
      }
    }
  }

}