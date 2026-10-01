import { describe, expect, it } from 'vitest';
import { basePath } from './paths.js';

describe('basePath', () => {
  it('prefixes the configured public path', () => {
    const result = basePath('/api/market-data/events', '/amisostock');
    expect(result.split(String.fromCharCode(47))).toEqual([
      '',
      'amisostock',
      'api',
      'market-data',
      'events',
    ]);
  });

  it('supports an application hosted at the domain root', () => {
    const result = basePath('/api/market-data/events', '');
    expect(result.split(String.fromCharCode(47))).toEqual([
      '',
      'api',
      'market-data',
      'events',
    ]);
  });

  it('rejects malformed application and base paths', () => {
    expect(() => basePath('api/events', '/amisostock')).toThrow(TypeError);
    expect(() => basePath('/api/events', '//host')).toThrow(TypeError);
  });
});
