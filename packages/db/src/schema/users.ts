import { sql } from 'drizzle-orm/sql';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { assets, sources } from './reference.js';

// SPEC §1.4 leaves column details open; these columns support the account,
// multi-portfolio, notification, and security decisions in §§6 and 9.
export const userRole = pgEnum('user_role', ['member', 'admin']);
export const portfolioKind = pgEnum('portfolio_kind', ['real', 'paper']);
export const basisMethodEnum = pgEnum('cost_basis_method', [
  'weighted_average',
  'fifo',
]);
export const transactionSide = pgEnum('transaction_side', ['buy', 'sell']);
export const transactionOrigin = pgEnum('transaction_origin', [
  'manual',
  'csv',
]);
export const alertKind = pgEnum('alert_kind', [
  'price_threshold',
  'percent_change',
  'volume_spike',
  'disclosure',
  'signal_change',
  'indicator_cross',
]);
export const notificationChannel = pgEnum('notification_channel', [
  'in_app',
  'email',
]);
export const notificationStatus = pgEnum('notification_status', [
  'pending',
  'delivered',
  'failed',
]);
export const observedFreshness = pgEnum('observed_freshness', [
  'live',
  'delayed',
  'close',
  'estimate',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRole('role').default('member').notNull(),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    totpSecretEncrypted: text('totp_secret_encrypted'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_uniq').on(sql`lower(${t.email})`),
    check(
      'users_email_trim_check',
      sql`${t.email} = btrim(${t.email}) AND ${t.email} <> ''`,
    ),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('sessions_refresh_token_hash_uniq').on(t.refreshTokenHash),
    index('sessions_user_expires_idx').on(t.userId, t.expiresAt),
  ],
);

export const allowlist = pgTable(
  'allowlist',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    invitedByUserId: uuid('invited_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('allowlist_email_uniq').on(sql`lower(${t.email})`),
    check(
      'allowlist_email_trim_check',
      sql`${t.email} = btrim(${t.email}) AND ${t.email} <> ''`,
    ),
  ],
);

export const portfolios = pgTable(
  'portfolios',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    kind: portfolioKind('kind').notNull(),
    costBasisMethod: basisMethodEnum('cost_basis_method')
      .default('weighted_average')
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('portfolios_id_user_uniq').on(t.id, t.userId),
    uniqueIndex('portfolios_user_name_uniq').on(t.userId, t.name),
  ],
);

export const positions = pgTable(
  'positions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    portfolioId: uuid('portfolio_id').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    quantity: numeric('quantity', { precision: 20, scale: 6 }).notNull(),
    averageCost: numeric('average_cost', { precision: 20, scale: 6 }).notNull(),
    costCurrency: text('cost_currency').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      name: 'positions_portfolio_owner_fk',
      columns: [t.portfolioId, t.userId],
      foreignColumns: [portfolios.id, portfolios.userId],
    }).onDelete('cascade'),
    uniqueIndex('positions_portfolio_asset_uniq').on(t.portfolioId, t.assetId),
    index('positions_user_idx').on(t.userId),
    check('positions_quantity_nonnegative', sql`${t.quantity} >= 0`),
    check('positions_average_cost_nonnegative', sql`${t.averageCost} >= 0`),
  ],
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    portfolioId: uuid('portfolio_id').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    side: transactionSide('side').notNull(),
    origin: transactionOrigin('origin').default('manual').notNull(),
    quantity: numeric('quantity', { precision: 20, scale: 6 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 20, scale: 6 }).notNull(),
    fee: numeric('fee', { precision: 20, scale: 6 }).default('0').notNull(),
    currency: text('currency').notNull(),
    baseCurrencyAtTrade: text('base_currency_at_trade').notNull(),
    fxRateToBaseAtTrade: numeric('fx_rate_to_base_at_trade', {
      precision: 20,
      scale: 6,
    }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    foreignKey({
      name: 'transactions_portfolio_owner_fk',
      columns: [t.portfolioId, t.userId],
      foreignColumns: [portfolios.id, portfolios.userId],
    }).onDelete('cascade'),
    index('transactions_user_portfolio_time_idx').on(
      t.userId,
      t.portfolioId,
      t.occurredAt,
    ),
    check('transactions_quantity_positive', sql`${t.quantity} > 0`),
    check('transactions_unit_price_nonnegative', sql`${t.unitPrice} >= 0`),
    check('transactions_fee_nonnegative', sql`${t.fee} >= 0`),
    check('transactions_fx_rate_positive', sql`${t.fxRateToBaseAtTrade} > 0`),
  ],
);

export const watchlists = pgTable(
  'watchlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('watchlists_id_user_uniq').on(t.id, t.userId),
    uniqueIndex('watchlists_user_name_uniq').on(t.userId, t.name),
  ],
);

export const watchlistItems = pgTable(
  'watchlist_items',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    watchlistId: uuid('watchlist_id').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    addedAt: timestamp('added_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.watchlistId, t.assetId] }),
    foreignKey({
      name: 'watchlist_items_watchlist_owner_fk',
      columns: [t.watchlistId, t.userId],
      foreignColumns: [watchlists.id, watchlists.userId],
    }).onDelete('cascade'),
    index('watchlist_items_user_idx').on(t.userId),
  ],
);

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assets.id),
    kind: alertKind('kind').notNull(),
    condition: jsonb('condition').$type<Record<string, unknown>>().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    cooldownMinutes: integer('cooldown_minutes').default(60).notNull(),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('alerts_id_user_uniq').on(t.id, t.userId),
    index('alerts_user_active_idx').on(t.userId, t.isActive),
    check('alerts_cooldown_nonnegative', sql`${t.cooldownMinutes} >= 0`),
  ],
);

export const alertEvents = pgTable(
  'alert_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    alertId: uuid('alert_id').notNull(),
    sourceId: uuid('source_id').references(() => sources.id),
    observedValue: numeric('observed_value', { precision: 20, scale: 6 }),
    observedCurrency: text('observed_currency'),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    freshness: observedFreshness('freshness').notNull(),
    delayMinutes: integer('delay_minutes').default(0).notNull(),
    triggeredAt: timestamp('triggered_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique('alert_events_id_user_uniq').on(t.id, t.userId),
    foreignKey({
      name: 'alert_events_alert_owner_fk',
      columns: [t.alertId, t.userId],
      foreignColumns: [alerts.id, alerts.userId],
    }).onDelete('cascade'),
    index('alert_events_user_triggered_idx').on(t.userId, t.triggeredAt),
    check(
      'alert_events_delay_freshness_check',
      sql`(${t.freshness} = 'delayed' AND ${t.delayMinutes} > 0)
        OR (${t.freshness} <> 'delayed' AND ${t.delayMinutes} = 0)`,
    ),
    check(
      'alert_events_value_provenance_check',
      sql`${t.observedValue} IS NULL OR (${t.observedCurrency} IS NOT NULL AND btrim(${t.observedCurrency}) <> '' AND ${t.sourceId} IS NOT NULL)`,
    ),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    alertEventId: uuid('alert_event_id'),
    channel: notificationChannel('channel').notNull(),
    status: notificationStatus('status').default('pending').notNull(),
    message: text('message').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => [
    foreignKey({
      name: 'notifications_alert_event_owner_fk',
      columns: [t.alertEventId, t.userId],
      foreignColumns: [alertEvents.id, alertEvents.userId],
    }).onDelete('cascade'),
    index('notifications_user_created_idx').on(t.userId, t.createdAt),
  ],
);

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  baseCurrency: text('base_currency').default('TRY').notNull(),
  theme: text('theme').default('dark').notNull(),
  dashboardLayout: jsonb('dashboard_layout')
    .$type<Record<string, unknown>>()
    .default({})
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Keep security/financial audit events after account deletion, without
    // retaining an identifying user FK. Never put personal data in details.
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    subjectType: text('subject_type'),
    subjectId: uuid('subject_id'),
    details: jsonb('details').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index('audit_log_user_occurred_idx').on(t.userId, t.occurredAt)],
);
