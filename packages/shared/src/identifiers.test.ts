import { describe, expect, it } from 'vitest';
import {
  parseIsoCurrency,
  parseCurrencyCode,
  parseProviderId,
  parseSignalId,
  parseSourceId,
  parseTicker,
} from './identifiers.js';

describe('branded identifiers', () => {
  it.each(['THYAO', 'BTC-USDT', 'USD/TRY', 'BRK.B'])(
    'accepts a valid ticker %s',
    (ticker) => {
      expect(parseTicker(ticker)).toBe(ticker);
    },
  );

  it.each(['', 'thyao', ' THYAO', 'USD//TRY', 'A'.repeat(33), 12])(
    'rejects an invalid ticker %s',
    (ticker) => {
      expect(() => parseTicker(ticker)).toThrow();
    },
  );

  it.each(['TRY', 'USD', 'EUR', 'XAU'])(
    'accepts an ISO currency %s',
    (currency) => {
      expect(parseIsoCurrency(currency)).toBe(currency);
    },
  );

  it.each(['try', 'ZZZ', 'USDT', '', null])(
    'rejects an invalid ISO currency %s',
    (currency) => {
      expect(() => parseIsoCurrency(currency)).toThrow();
    },
  );

  it('accepts USDT as a provider settlement currency without calling it ISO', () => {
    expect(parseCurrencyCode('USDT')).toBe('USDT');
    expect(() => parseCurrencyCode('ZZZ')).toThrow();
  });

  it('keeps adapter slugs distinct from persisted source UUIDs', () => {
    expect(parseProviderId('tcmb-evds')).toBe('tcmb-evds');
    expect(parseSourceId('f36625f5-813a-4335-8f22-004b06e3d113')).toBe(
      'f36625f5-813a-4335-8f22-004b06e3d113',
    );
    expect(() => parseSourceId('tcmb-evds')).toThrow();
    expect(() =>
      parseProviderId('f36625f5-813a-4335-8f22-004b06e3d113'),
    ).toThrow();
    expect(() => parseProviderId('TCMB EVDS')).toThrow();
  });

  it('validates signal identities', () => {
    expect(parseSignalId('a875b109-a994-4bf3-82f5-f5a4308ca2ab')).toBe(
      'a875b109-a994-4bf3-82f5-f5a4308ca2ab',
    );
    expect(() => parseSignalId('not-a-uuid')).toThrow();
  });
});
