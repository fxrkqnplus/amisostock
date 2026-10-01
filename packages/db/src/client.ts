import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, inArray } from 'drizzle-orm';
import { Pool } from 'pg';
import * as schema from './schema/index.js';

export type AssetProviderMapping = Readonly<{
  assetClass: string;
  assetId: string;
  currency: string;
  providerId: string;
  providerSymbol: string;
  ticker: string;
}>;

export type MarketDataSourceRegistration = Readonly<{
  name: string;
  priority: number;
  attributionText: string;
  licenseNote: string;
}>;

export type MarketQuoteWrite = Readonly<{
  assetId: string;
  currency: string;
  price: string;
  changeAbs: string | null;
  changePct: string | null;
  dayHigh: string | null;
  dayLow: string | null;
  volume: string | null;
  asOf: Date;
  sourceId: string;
  freshness: 'live' | 'delayed' | 'close' | 'estimate';
  delayMinutes: number | null;
}>;

function createDrizzleDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}

type DrizzleDatabase = ReturnType<typeof createDrizzleDatabase>;

async function loadAssetProviderMappings(
  db: DrizzleDatabase,
  providerIds: readonly string[],
): Promise<AssetProviderMapping[]> {
  return db
    .select({
      assetClass: schema.assets.assetClass,
      assetId: schema.assets.id,
      currency: schema.assets.currency,
      providerId: schema.assetProviderSymbols.providerId,
      providerSymbol: schema.assetProviderSymbols.providerSymbol,
      ticker: schema.assets.ticker,
    })
    .from(schema.assetProviderSymbols)
    .innerJoin(
      schema.assets,
      eq(schema.assetProviderSymbols.assetId, schema.assets.id),
    )
    .where(
      and(
        inArray(schema.assetProviderSymbols.providerId, [...providerIds]),
        eq(schema.assets.status, 'active'),
      ),
    );
}

async function registerMarketDataSource(
  db: DrizzleDatabase,
  input: MarketDataSourceRegistration,
): Promise<string> {
  const [row] = await db
    .insert(schema.sources)
    .values({
      kind: 'market',
      name: input.name,
      priority: input.priority,
      attributionText: input.attributionText,
      licenseNote: input.licenseNote,
    })
    .onConflictDoUpdate({
      target: [schema.sources.kind, schema.sources.name],
      set: {
        priority: input.priority,
        attributionText: input.attributionText,
        licenseNote: input.licenseNote,
      },
    })
    .returning({ id: schema.sources.id });
  if (row === undefined)
    throw new Error('Could not register market data source');
  return row.id;
}

async function upsertMarketQuote(
  db: DrizzleDatabase,
  values: MarketQuoteWrite,
): Promise<void> {
  await db
    .insert(schema.quotes)
    .values(values)
    .onConflictDoUpdate({
      target: schema.quotes.assetId,
      set: {
        currency: values.currency,
        price: values.price,
        changeAbs: values.changeAbs,
        changePct: values.changePct,
        dayHigh: values.dayHigh,
        dayLow: values.dayLow,
        volume: values.volume,
        asOf: values.asOf,
        sourceId: values.sourceId,
        freshness: values.freshness,
        delayMinutes: values.delayMinutes,
      },
    });
}

export function createDatabaseClient(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });
  const db = createDrizzleDatabase(pool);
  return {
    loadAssetProviderMappings: (providerIds: readonly string[]) =>
      loadAssetProviderMappings(db, providerIds),
    registerMarketDataSource: (input: MarketDataSourceRegistration) =>
      registerMarketDataSource(db, input),
    upsertMarketQuote: (values: MarketQuoteWrite) =>
      upsertMarketQuote(db, values),
    query: async (query: string, values: readonly unknown[] = []) => {
      await pool.query(query, [...values]);
    },
    close: () => pool.end(),
  };
}
