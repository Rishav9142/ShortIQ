import { relations } from 'drizzle-orm';
import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const urls = pgTable('urls', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  originalUrl: text('original_url').notNull(),
  alias: text('alias').notNull().unique(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('urls_user_id_idx').on(table.userId),
  uniqueIndex('urls_alias_idx').on(table.alias),
]);

export const clicks = pgTable('clicks', {
  id: serial('id').primaryKey(),
  urlId: integer('url_id')
    .references(() => urls.id, { onDelete: 'cascade' })
    .notNull(),
  ipHash: text('ip_hash'),
  country: text('country'),
  region: text('region'),
  city: text('city'),
  deviceType: text('device_type'),
  browser: text('browser'),
  os: text('os'),
  referrer: text('referrer'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('clicks_url_id_idx').on(table.urlId),
  index('clicks_created_at_idx').on(table.createdAt),
]);

export const usersRelations = relations(users, ({ many }) => ({
  urls: many(urls),
}));

export const urlsRelations = relations(urls, ({ one, many }) => ({
  author: one(users, {
    fields: [urls.userId],
    references: [users.id],
  }),
  clicks: many(clicks),
}));

export const clicksRelations = relations(clicks, ({ one }) => ({
  url: one(urls, {
    fields: [clicks.urlId],
    references: [urls.id],
  }),
}));
