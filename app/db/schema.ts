import {
  mysqlTable, mysqlEnum, serial, varchar, text, timestamp, decimal, bigint, int, boolean, json,
} from "drizzle-orm/mysql-core";

// ═══════════════════════════════════════════════════
//  B1 PLATFORM — Multi-Tenant SaaS Schema
// ═══════════════════════════════════════════════════

// ─── Venues (Tenants) ───
export const venues = mysqlTable("venues", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  subdomain: varchar("subdomain", { length: 50 }).unique(),
  customDomain: varchar("custom_domain", { length: 100 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  primaryColor: varchar("primary_color", { length: 7 }).default("#181818"),
  accentColor: varchar("accent_color", { length: 7 }).default("#5E8B8B"),
  description: text("description"),
  address: varchar("address", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  hoursWeekday: varchar("hours_weekday", { length: 64 }),
  hoursSaturday: varchar("hours_saturday", { length: 64 }),
  hoursSunday: varchar("hours_sunday", { length: 64 }),

  // Square POS Integration
  squareMerchantId: varchar("square_merchant_id", { length: 50 }),
  squareLocationId: varchar("square_location_id", { length: 50 }),
  squareAccessToken: text("square_access_token"),
  squareRefreshToken: text("square_refresh_token"),
  squareTokenExpiresAt: timestamp("square_token_expires_at"),
  squareEnabled: boolean("square_enabled").default(false),

  // Stripe Billing
  stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
  subscriptionTier: mysqlEnum("subscription_tier", ["starter", "pro", "enterprise"]).default("starter"),
  subscriptionStatus: mysqlEnum("subscription_status", ["trial", "active", "past_due", "cancelled"]).default("trial"),
  trialEndsAt: timestamp("trial_ends_at"),

  // Settings
  settingsJson: json("settings_json"),

  // Status
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Venue = typeof venues.$inferSelect;

// ─── Venue Owners (Platform Users who own/manage venues) ───
export const venueOwners = mysqlTable("venue_owners", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: mysqlEnum("role", ["owner", "manager"]).default("owner"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Platform Admins (B1 Platform staff) ───
export const platformAdmins = mysqlTable("platform_admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["superadmin", "support"]).default("support"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Locations (per-venue) ───
export const locations = mysqlTable("locations", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  name: varchar("name", { length: 128 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  isDefault: boolean("is_default").default(false),
  hoursWeekday: varchar("hours_weekday", { length: 64 }),
  hoursSaturday: varchar("hours_saturday", { length: 64 }),
  hoursSunday: varchar("hours_sunday", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Menu Items (per-venue) ───
export const menuItems = mysqlTable("menu_items", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: mysqlEnum("category", ["coffee", "pastries", "bread"]).notNull(),
  dietary: text("dietary"),
  image: varchar("image", { length: 255 }),
  isDailySpecial: boolean("is_daily_special").default(false),
  isLimited: boolean("is_limited").default(false),
  originRegion: varchar("origin_region", { length: 255 }),
  originFarm: varchar("origin_farm", { length: 255 }),
  originAltitude: varchar("origin_altitude", { length: 64 }),
  originProcess: varchar("origin_process", { length: 128 }),
  originTastingNotes: text("origin_tasting_notes"),
  originStory: text("origin_story"),
  // Square catalog ID for sync
  squareCatalogId: varchar("square_catalog_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MenuItem = typeof menuItems.$inferSelect;

// ─── Inventory (per-venue) ───
export const inventory = mysqlTable("inventory", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  menuItemId: bigint("menu_item_id", { mode: "number", unsigned: true }).notNull().references(() => menuItems.id),
  isAvailable: boolean("is_available").notNull().default(true),
  soldOutAt: timestamp("sold_out_at"),
  restockedAt: timestamp("restocked_at"),
  staffNote: text("staff_note"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Bundles (per-venue) ───
export const bundles = mysqlTable("bundles", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  itemSlugs: text("item_slugs").notNull(),
  bundlePrice: decimal("bundle_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Staff Accounts (per-venue) ───
export const staffAccounts = mysqlTable("staff_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "manager", "staff"]).default("staff").notNull(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type StaffAccount = typeof staffAccounts.$inferSelect;

// ─── Orders (per-venue) ───
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  orderNumber: varchar("order_number", { length: 32 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "ready", "completed", "cancelled"]).default("pending").notNull(),
  pickupTime: varchar("pickup_time", { length: 32 }).notNull(),
  orderNote: text("order_note"),
  staffNote: text("staff_note"),
  paymentMethod: mysqlEnum("payment_method", ["online", "pickup"]).default("pickup").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  locationId: bigint("location_id", { mode: "number", unsigned: true }),
  // Square order ID for sync
  squareOrderId: varchar("square_order_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Order = typeof orders.$inferSelect;

// ─── Order Items ───
export const orderItems = mysqlTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull().references(() => orders.id),
  menuItemId: bigint("menu_item_id", { mode: "number", unsigned: true }).notNull().references(() => menuItems.id),
  itemName: varchar("item_name", { length: 128 }).notNull(),
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Loyalty (per-venue) ───
export const loyaltyAccounts = mysqlTable("loyalty_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }),
  pointsBalance: int("points_balance").notNull().default(0),
  totalLifetimePoints: int("total_lifetime_points").notNull().default(0),
  coffeesRedeemed: int("coffees_redeemed").notNull().default(0),
  pastriesRedeemed: int("pastries_redeemed").notNull().default(0),
  breadRedeemed: int("bread_redeemed").notNull().default(0),
  referralCredit: decimal("referral_credit", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Loyalty Transactions ───
export const loyaltyTransactions = mysqlTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  accountId: bigint("account_id", { mode: "number", unsigned: true }).notNull().references(() => loyaltyAccounts.id),
  type: mysqlEnum("type", ["earn", "redeem"]).notNull(),
  points: int("points").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customer Preferences (per-venue) ───
export const customerPreferences = mysqlTable("customer_preferences", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  milk: varchar("milk", { length: 32 }),
  temperature: varchar("temperature", { length: 32 }),
  sugar: varchar("sugar", { length: 32 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Subscription Passes (per-venue) ───
export const subscriptionPasses = mysqlTable("subscription_passes", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  totalCredits: int("total_credits").notNull(),
  remainingCredits: int("remaining_credits").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Referral Codes (per-venue) ───
export const referralCodes = mysqlTable("referral_codes", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  code: varchar("code", { length: 16 }).notNull(),
  referrerPhone: varchar("referrer_phone", { length: 32 }).notNull(),
  referrerName: varchar("referrer_name", { length: 255 }),
  creditEarned: decimal("credit_earned", { precision: 10, scale: 2 }).notNull().default("0"),
  uses: int("uses").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Gift Cards (per-venue) ───
export const giftCards = mysqlTable("gift_cards", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  code: varchar("code", { length: 16 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  recipientName: varchar("recipient_name", { length: 255 }),
  recipientPhone: varchar("recipient_phone", { length: 32 }),
  message: text("message"),
  isRedeemed: boolean("is_redeemed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Reviews (per-venue) ───
export const reviews = mysqlTable("reviews", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull().references(() => orders.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Corporate Accounts (per-venue) ───
export const corporateAccounts = mysqlTable("corporate_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 32 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }),
  billingAddress: text("billing_address"),
  paymentTerms: mysqlEnum("payment_terms", ["prepaid", "net_7", "net_14", "net_30"]).default("net_7"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Catering Requests (per-venue) ───
export const cateringRequests = mysqlTable("catering_requests", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  eventDate: varchar("event_date", { length: 32 }).notNull(),
  guestCount: int("guest_count").notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["new", "quoted", "confirmed", "completed"]).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Push Subscriptions (per-venue) ───
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number", unsigned: true }).notNull().references(() => venues.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
