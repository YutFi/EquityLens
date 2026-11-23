import type { MarketConfig } from './markets';

export type MarketState = 'open' | 'break' | 'closed' | 'weekend';

export interface MarketStatus {
  state: MarketState;
  label: string;
  /** Local exchange time as HH:MM. */
  localTime: string;
  holidayCaveat: boolean;
}

/**
 * Reports whether the exchange is inside its standard session hours.
 * Holidays are not known to the app, so this is always flagged with `holidayCaveat`.
 */
export function getMarketStatus(market: MarketConfig, now: Date = new Date()): MarketStatus {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: market.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekday = get('weekday');
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const minutes = hour * 60 + minute;
  const localTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  if (weekday === 'Sat' || weekday === 'Sun') {
    return { state: 'weekend', label: 'Closed (weekend)', localTime, holidayCaveat: true };
  }
  const first = market.sessions[0];
  const last = market.sessions[market.sessions.length - 1];
  if (minutes < first.open || minutes >= last.close) {
    return { state: 'closed', label: 'Closed (outside session hours)', localTime, holidayCaveat: true };
  }
  for (const s of market.sessions) {
    if (minutes >= s.open && minutes < s.close) {
      return { state: 'open', label: 'Open (standard hours)', localTime, holidayCaveat: true };
    }
  }
  return { state: 'break', label: 'Midday break', localTime, holidayCaveat: true };
}
