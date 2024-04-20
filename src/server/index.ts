import express from "express";
import { MarketData } from "handlers/marketdata";
import { Orders } from "handlers/orders";
import { Operations } from "handlers/operations";
import { Broker } from "../broker";

const app = express();

app.use(express.json());

const broker = new Broker();

const marketdata = new MarketData(broker);
const orders = new Orders(broker);
const operations = new Operations(broker);

app.use(marketdata.router);
app.use(orders.router);
app.use(operations.router);

export { app };
