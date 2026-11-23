/**
 * Hypothetical investment simulator maths. No brokerage connection: every transaction is typed in
 * by the user and every figure is labelled "simulated". Average-cost method.
 */

export type TxnType = 'buy' | 'sell' | 'dividend';

export interface Txn {
  id: string;
  securityId: string;
  /** YYYY-MM-DD */
  date: string;
  type: TxnType;
  /** Shares bought/sold, or shares held when a dividend was received. */
  shares: number;
  /** Price per share, or dividend per share for dividends. */
  price: number;
  /** Brokerage and other costs for this transaction (entered by the user). */
  fees: number;
}

export interface Portfolio {
  id: string;
  name: string;
  currency: string;
  createdAt: string;
  txns: Txn[];
}

export interface Position {
  securityId: string;
  shares: number;
  avgCost: number;
  cost: number;
  lastPrice: number | null;
  marketValue: number | null;
  unrealised: number | null;
  unrealisedPct: number | null;
  realised: number;
  dividends: number;
  fees: number;
  /** Total ever paid for purchases, fees included. */
  bought: number;
}

export interface PortfolioSummary {
  positions: Position[];
  totalCost: number;
  totalValue: number | null;
  unrealised: number | null;
  realised: number;
  dividends: number;
  fees: number;
  /** Unrealised + realised + dividends (fees are already inside cost and realised). Percentage is over everything ever bought. */
  totalReturn: number | null;
  totalReturnPct: number | null;
  problems: string[];
}

export function validateTxn(t: Omit<Txn, 'id'>, existing: Txn[]): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return 'Enter the date as YYYY-MM-DD.';
  if (!(t.shares > 0)) return 'Shares must be greater than zero.';
  if (!(t.price >= 0)) return 'Price cannot be negative.';
  if (!(t.fees >= 0)) return 'Fees cannot be negative.';
  if (t.type === 'sell' || t.type === 'dividend') {
    const held = sharesHeldOn(existing, t.securityId, t.date);
    if (t.type === 'sell' && t.shares > held + 1e-9) return `You only held ${held} shares on that date, so you cannot sell ${t.shares}.`;
  }
  return null;
}

function sharesHeldOn(txns: Txn[], securityId: string, date: string): number {
  let n = 0;
  for (const t of txns.filter((x) => x.securityId === securityId && x.date <= date)) {
    if (t.type === 'buy') n += t.shares; else if (t.type === 'sell') n -= t.shares;
  }
  return n;
}

export function summarise(p: Portfolio, priceOf: (securityId: string) => number | null): PortfolioSummary {
  const problems: string[] = [];
  const order = [...p.txns].sort((a, b) => (a.date === b.date ? (a.type === 'buy' ? -1 : 1) - (b.type === 'buy' ? -1 : 1) : a.date < b.date ? -1 : 1));
  const map = new Map<string, { shares: number; cost: number; realised: number; dividends: number; fees: number; bought: number }>();
  for (const t of order) {
    const s = map.get(t.securityId) ?? { shares: 0, cost: 0, realised: 0, dividends: 0, fees: 0, bought: 0 };
    if (t.type === 'buy') {
      s.shares += t.shares;
      s.cost += t.shares * t.price + t.fees;
      s.bought += t.shares * t.price + t.fees;
      s.fees += t.fees;
    } else if (t.type === 'sell') {
      if (t.shares > s.shares + 1e-9) { problems.push(`A sale of ${t.shares} ${t.securityId} on ${t.date} exceeds the shares held; it was skipped.`); map.set(t.securityId, s); continue; }
      const avg = s.shares > 0 ? s.cost / s.shares : 0;
      s.realised += (t.price - avg) * t.shares - t.fees;
      s.cost -= avg * t.shares;
      s.shares -= t.shares;
      s.fees += t.fees;
    } else {
      s.dividends += t.shares * t.price - t.fees;
      s.fees += t.fees;
    }
    map.set(t.securityId, s);
  }
  const positions: Position[] = [...map.entries()].map(([securityId, s]) => {
    const last = priceOf(securityId);
    const mv = last != null ? last * s.shares : null;
    return {
      securityId, shares: s.shares, avgCost: s.shares > 0 ? s.cost / s.shares : 0, cost: s.cost,
      lastPrice: last, marketValue: mv,
      unrealised: mv != null ? mv - s.cost : null,
      unrealisedPct: mv != null && s.cost > 0 ? ((mv - s.cost) / s.cost) * 100 : null,
      realised: s.realised, dividends: s.dividends, fees: s.fees, bought: s.bought,
    };
  });
  const open = positions.filter((x) => x.shares > 1e-9);
  const allPriced = open.every((x) => x.marketValue != null);
  const totalCost = open.reduce((a, x) => a + x.cost, 0);
  const totalValue = allPriced ? open.reduce((a, x) => a + (x.marketValue as number), 0) : null;
  const realised = positions.reduce((a, x) => a + x.realised, 0);
  const dividends = positions.reduce((a, x) => a + x.dividends, 0);
  const unrealised = totalValue != null ? totalValue - totalCost : null;
  if (!allPriced) problems.push('Some holdings have no loaded price, so the portfolio value and unrealised profit are not shown rather than guessed.');
  const totalReturn = unrealised != null ? unrealised + realised + dividends : null;
  const invested = positions.reduce((a, x) => a + x.bought, 0);
  return {
    positions, totalCost, totalValue, unrealised, realised, dividends, fees: positions.reduce((a, x) => a + x.fees, 0),
    totalReturn, totalReturnPct: totalReturn != null && invested > 0 ? (totalReturn / invested) * 100 : null, problems,
  };
}
