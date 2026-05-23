import { relations } from "drizzle-orm";
import {
  venues,
  venueOwners,
  staffAccounts,
  menuItems,
  orders,
  orderItems,
  inventory,
  loyaltyAccounts,
  loyaltyTransactions,
  locations,
} from "./schema";

export const venuesRelations = relations(venues, ({ many }) => ({
  owners: many(venueOwners),
  staff: many(staffAccounts),
  menuItems: many(menuItems),
  orders: many(orders),
  inventory: many(inventory),
  loyaltyAccounts: many(loyaltyAccounts),
  locations: many(locations),
}));

export const venueOwnersRelations = relations(venueOwners, ({ one }) => ({
  venue: one(venues, { fields: [venueOwners.venueId], references: [venues.id] }),
}));

export const staffAccountsRelations = relations(staffAccounts, ({ one }) => ({
  venue: one(venues, { fields: [staffAccounts.venueId], references: [venues.id] }),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  venue: one(venues, { fields: [menuItems.venueId], references: [venues.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  venue: one(venues, { fields: [orders.venueId], references: [venues.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderItems.menuItemId], references: [menuItems.id] }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  venue: one(venues, { fields: [inventory.venueId], references: [venues.id] }),
  menuItem: one(menuItems, { fields: [inventory.menuItemId], references: [menuItems.id] }),
}));

export const loyaltyAccountsRelations = relations(loyaltyAccounts, ({ one, many }) => ({
  venue: one(venues, { fields: [loyaltyAccounts.venueId], references: [venues.id] }),
  transactions: many(loyaltyTransactions),
}));

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
  account: one(loyaltyAccounts, { fields: [loyaltyTransactions.accountId], references: [loyaltyAccounts.id] }),
  venue: one(venues, { fields: [loyaltyTransactions.venueId], references: [venues.id] }),
}));

export const locationsRelations = relations(locations, ({ one }) => ({
  venue: one(venues, { fields: [locations.venueId], references: [venues.id] }),
}));
