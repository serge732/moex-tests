import { Instrument, InstrumentRequest, InstrumentResponse } from "shared/types/instruments";
import { moexInstance } from "./instance";

export class Instruments {
  async getInstrumentBy(req: InstrumentRequest): Promise<InstrumentResponse> {
    const response = await moexInstance.get<InstrumentResponse>(
      `securities/${req.secId}.json?engine=${req.engine}&market=${req.market}`
    );
    return {
      instrument: {
        engine: req.engine,
        market: req.market,
        secId: req.secId,
        lot: 1
      } as Instrument
    };
  }
}