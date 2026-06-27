import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  nombre: text('nombre').notNull(),
  ruc: text('ruc'),
  contacto: text('contacto'),
  telefono: text('telefono'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cotizaciones = pgTable('cotizaciones', {
  id: text('id').primaryKey(), // Unified unique identifier
  userId: integer('user_id').references(() => users.id).notNull(),
  clientId: integer('client_id').references(() => clients.id),
  numero: text('numero').notNull(),
  prefix: text('prefix').notNull(),
  fecha: text('fecha').notNull(),
  proyecto: text('proyecto'),
  observaciones: text('observaciones'),
  igvActivo: boolean('igv_activo').default(true),
  subtotal: doublePrecision('subtotal').notNull(),
  igv: doublePrecision('igv').notNull(),
  total: doublePrecision('total').notNull(),
  moneda: text('moneda').default('S/'),
  discountPercentage: doublePrecision('discount_percentage').default(0),
  discountAmount: doublePrecision('discount_amount').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const cotizacionItems = pgTable('cotizacion_items', {
  id: text('id').primaryKey(), // We can use the item's uuid string
  cotizacionId: text('cotizacion_id').references(() => cotizaciones.id).notNull(),
  producto: text('producto').notNull(),
  cantidad: doublePrecision('cantidad').notNull(),
  unidad: text('unidad').notNull(),
  valorUnitario: doublePrecision('valor_unitario').notNull(),
  confirmed: boolean('confirmed').default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  clients: many(clients),
  cotizaciones: many(cotizaciones),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  cotizaciones: many(cotizaciones),
}));

export const cotizacionesRelations = relations(cotizaciones, ({ one, many }) => ({
  user: one(users, { fields: [cotizaciones.userId], references: [users.id] }),
  client: one(clients, { fields: [cotizaciones.clientId], references: [clients.id] }),
  items: many(cotizacionItems),
}));

export const cotizacionItemsRelations = relations(cotizacionItems, ({ one }) => ({
  cotizacion: one(cotizaciones, { fields: [cotizacionItems.cotizacionId], references: [cotizaciones.id] }),
}));
