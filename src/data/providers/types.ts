import type { MarketId, PriceSeries, ProviderResult } from '../../core/types';

/**
 * A price-data provider is an independent adapter that turns some source into the standard
 * internal model. The application depends only on this interface, so a provider can be added,
 * replaced or removed without touching any page.
 */
export interface PriceProvider {
  id: string;
  name: string;
  supportsMarket(market: MarketId): boolean;
  /** Return every series this provider can currently supply. */
  listSeries(): Promise<ProviderResult<PriceSeries[]>>;
}

export interface LoadReport {
  series: PriceSeries[];
  failures: { providerId: string; providerName: string; code: string; message: string }[];
}
