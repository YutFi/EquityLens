import type { LoadReport, PriceProvider } from './types';
import { localProvider } from './localProvider';

/**
 * Registered providers. To add a source, implement PriceProvider and append it here.
 * See docs/DATA_PROVIDERS.md for why no network provider ships in Phase 1.
 */
export const PROVIDERS: PriceProvider[] = [localProvider];

/**
 * Loads from every provider independently. One provider failing never prevents the others from
 * loading, and never crashes the application: failures are returned so they can be shown.
 */
export async function loadFromProviders(providers: PriceProvider[] = PROVIDERS): Promise<LoadReport> {
  const settled = await Promise.allSettled(providers.map((p) => p.listSeries()));
  const report: LoadReport = { series: [], failures: [] };
  settled.forEach((res, i) => {
    const p = providers[i];
    if (res.status === 'rejected') {
      report.failures.push({
        providerId: p.id, providerName: p.name, code: 'unavailable',
        message: res.reason instanceof Error ? res.reason.message : String(res.reason),
      });
    } else if (!res.value.ok) {
      report.failures.push({ providerId: p.id, providerName: p.name, ...res.value.error });
    } else {
      report.series.push(...res.value.data);
    }
  });
  return report;
}
