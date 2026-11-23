import type { Security } from '../core/types';

/**
 * SEED DIRECTORY (UNVERIFIED).
 *
 * A short starter list of well-known Bursa Malaysia securities so the search box has something to
 * find before any data is imported. It was compiled by hand, is NOT the official KLCI constituent
 * list and is NOT a complete market listing. Names, codes and sectors can be out of date.
 * Sector is only filled in where the maintainers were confident; otherwise it is left blank rather
 * than guessed. Check every entry against Bursa Malaysia before relying on it.
 *
 * Users can add any security by importing data and typing its code and name.
 */
const rows: [code: string, name: string, sector?: string][] = [
  ['1155', 'Malayan Banking Bhd', 'Financial Services'],
  ['1295', 'Public Bank Bhd', 'Financial Services'],
  ['1023', 'CIMB Group Holdings Bhd', 'Financial Services'],
  ['5819', 'Hong Leong Bank Bhd', 'Financial Services'],
  ['1066', 'RHB Bank Bhd', 'Financial Services'],
  ['1015', 'AMMB Holdings Bhd', 'Financial Services'],
  ['1818', 'Bursa Malaysia Bhd', 'Financial Services'],
  ['5347', 'Tenaga Nasional Bhd', 'Utilities'],
  ['5225', 'IHH Healthcare Bhd', 'Health Care'],
  ['7113', 'Top Glove Corporation Bhd', 'Health Care'],
  ['5168', 'Hartalega Holdings Bhd', 'Health Care'],
  ['6888', 'Axiata Group Bhd', 'Telecommunications & Media'],
  ['6012', 'Maxis Bhd', 'Telecommunications & Media'],
  ['6947', 'CelcomDigi Bhd', 'Telecommunications & Media'],
  ['4863', 'Telekom Malaysia Bhd', 'Telecommunications & Media'],
  ['5296', 'MR D.I.Y. Group (M) Bhd', 'Consumer Products & Services'],
  ['1961', 'IOI Corporation Bhd', 'Plantation'],
  ['2445', 'Kuala Lumpur Kepong Bhd', 'Plantation'],
  ['5285', 'SD Guthrie Bhd', 'Plantation'],
  ['5288', 'Sime Darby Property Bhd', 'Property'],
  ['5398', 'Gamuda Bhd', 'Construction'],
  ['5183', 'Petronas Chemicals Group Bhd'],
  ['5681', 'Petronas Dagangan Bhd'],
  ['6033', 'Petronas Gas Bhd'],
  ['3816', 'MISC Bhd'],
  ['4197', 'Sime Darby Bhd'],
  ['3182', 'Genting Bhd'],
  ['4715', 'Genting Malaysia Bhd'],
  ['8869', 'Press Metal Aluminium Holdings Bhd'],
  ['4707', 'Nestle (Malaysia) Bhd'],
  ['7084', 'QL Resources Bhd'],
  ['4065', 'PPB Group Bhd'],
];

export const BENCHMARK_ID = 'XKLS:KLCI';

export const KLCI_INDEX: Security = {
  id: BENCHMARK_ID,
  market: 'XKLS',
  code: 'KLCI',
  name: 'FTSE Bursa Malaysia KLCI (index)',
  kind: 'index',
  currency: 'MYR',
  origin: 'seed',
  benchmark: true,
};

export const SEED_SECURITIES: Security[] = [
  KLCI_INDEX,
  ...rows.map(([code, name, sector]): Security => ({
    id: `XKLS:${code}`,
    market: 'XKLS',
    code,
    name,
    kind: 'equity',
    sector,
    currency: 'MYR',
    origin: 'seed',
  })),
];
