import type { PriceProvider } from './types';
import { loadAllSeries } from '../storage';

/** Supplies series the user imported (or generated as demo data) into this browser's IndexedDB. */
export const localProvider: PriceProvider = {
  id: 'local-import',
  name: 'Local import (your browser)',
  supportsMarket: () => true,
  async listSeries() {
    try {
      return { ok: true, data: await loadAllSeries() };
    } catch (e) {
      return {
        ok: false,
        error: { code: 'unavailable', message: `Browser storage could not be read: ${e instanceof Error ? e.message : String(e)}` },
      };
    }
  },
};
