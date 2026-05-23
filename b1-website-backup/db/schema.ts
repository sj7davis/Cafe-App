import {
  mysqlTable, mysqlEnum, serial, varchar, text, timestamp, decimal, bigint, int, boolean,
} from "drizzle-orm/mysql-core";

// ─── Users ───
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;

// ─── Locations (multi-location) ───
export const locations = mysqlTable("locations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  isDefault: boolean("is_default").default(false),
  hoursWeekday: varchar("hours_weekday", { length: 64 }),
  hoursSaturday: varchar("hours_saturday", { length: 64 }),
  hoursSunday: varchar("hours_sunday", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Menu Items ───
export const menuItems = mysqlTable("menu_items", {
  id: serial("id").primaryKey(),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MenuItem = typeof menuItems.$inferSelect;

// ─── Inventory ───
export const inventory = mysqlTable("inventory", {
  id: serial("id").primaryKey(),
  menuItemId: bigint("menu_item_id", { mode: "number", unsigned: true }).notNull().references(() => menuItems.id),
  isAvailable: boolean("is_available").notNull().default(true),
  soldOutAt: timestamp("sold_out_at"),
  restockedAt: timestamp("restocked_at"),
  staffNote: text("staff_note"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Bundles ───
export const bundles = mysqlTable("bundles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  itemSlugs: text("item_slugs").notNull(), // JSON array of menu item slugs
  bundlePrice: decimal("bundle_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customer Preferences ───
export const customerPreferences = mysqlTable("customer_preferences", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  milk: varchar("milk", { length: 32 }),
  temperature: varchar("temperature", { length: 32 }),
  sugar: varchar("sugar", { length: 32 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Subscription Passes ───
export const subscriptionPasses = mysqlTable("subscription_passes", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  totalCredits: int("total_credits").notNull(),
  remainingCredits: int("remaining_credits").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Referral Codes ───
export const referralCodes = mysqlTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 16 }).notNull().unique(),
  referrerPhone: varchar("referrer_phone", { length: 32 }).notNull(),
  referrerName: varchar("referrer_name", { length: 255 }),
  creditEarned: decimal("credit_earned", { precision: 10, scale: 2 }).notNull().default("0"),
  uses: int("uses").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Corporate Accounts ───
export const corporateAccounts = mysqlTable("corporate_accounts", {
  id: serial("id").primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 32 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }),
  billingAddress: text("billing_address"),
  paymentTerms: mysqlEnum("payment_terms", ["prepaid", "net_7", "net_14", "net_30"]).default("net_7"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Push Subscriptions ───
export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Orders ───
export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
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

// ─── Loyalty ───
export const loyaltyAccounts = mysqlTable("loyalty_accounts", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull().unique(),
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
  accountId: bigint("account_id", { mode: "number", unsigned: true }).notNull().references(() => loyaltyAccounts.id),
  type: mysqlEnum("type", ["earn", "redeem"]).notNull(),
  points: int("points").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Favourites ───
export const favourites = mysqlTable("favourites", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  menuItemId: bigint("menu_item_id", { mode: "number", unsigned: true }).notNull().references(() => menuItems.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Reviews ───
export const reviews = mysqlTable("reviews", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number", unsigned: true }).notNull().references(() => orders.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Gift Cards ───
export const giftCards = mysqlTable("gift_cards", {
  id: serial("id").primaryKey(),
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

// ─── Staff Accounts ───
export const staffAccounts = mysqlTable("staff_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "manager", "staff"]).default("staff").notNull(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StaffAccount = typeof staffAccounts.$inferSelect;

// ─── Catering ───
export const cateringRequests = mysqlTable("catering_requests", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  eventDate: varchar("event_date", { length: 32 }).notNull(),
  guestCount: int("guest_count").notNull(),
  details: text("details"),
  status: mysqlEnum("status", ["new", "quoted", "confirmed", "completed"]).default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
