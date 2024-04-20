import { Instruments } from "./instruments";
import { MarketData } from "./marketdata";

export class MoexApi {
  instruments: Instruments
  marketdata: MarketData

  constructor() {
    this.instruments = new Instruments();
    this.marketdata = new MarketData();
  }
}