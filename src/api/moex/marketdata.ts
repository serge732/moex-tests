import { CandleInterval, GetCandlesRequest, HistoricCandle } from "shared/types/marketdata";
import { moexInstance } from "./instance";

export class MarketData {
  async getCandles({ engine, market, secId, interval, from, to }: GetCandlesRequest) {
    const queryParams = [
      (from || '') && `from=${from?.toISOString()}`,
      (interval || '') && `interval=${interval}`,
      (to || '') && `till=${to?.toISOString()}`,
    ]
    const response = await moexInstance.get(
      `engines/${engine}/markets/${market}/securities/${secId}/candles.json?${queryParams.join(
        '&',
      )}`
    );
    const candles: HistoricCandle[] = (response.data.candles.data as any[]).map((candl) => ({
      open: {
        units: Math.trunc(candl[0]),
        nano: candl[0] - Math.trunc(candl[0])
      },
      close: {
        units: Math.trunc(candl[1]),
        nano: candl[1] - Math.trunc(candl[0])
      },
      high: {
        units: Math.trunc(candl[2]),
        nano: candl[2] - Math.trunc(candl[0])
      },
      low: {
        units: Math.trunc(candl[3]),
        nano: candl[3] - Math.trunc(candl[0])
      },
      volume: candl[5]
    }))
    return { candles: candles };
  }
}