import {
  pgTable, pgEnum, serial, varchar, text, timestamp, numeric, bigint, integer, boolean, json, index,
} from "drizzle-orm/pg-core";

// ═══════════════════════════════════════════════════
//  B1 PLATFORM — Multi-Tenant SaaS Schema
// ═══════════════════════════════════════════════════

// ─── Enums ───
export const subscriptionTierEnum = pgEnum("subscription_tier", ["starter", "pro", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trial", "active", "past_due", "cancelled"]);
export const ownerRoleEnum = pgEnum("owner_role", ["owner", "manager"]);
export const adminRoleEnum = pgEnum("admin_role", ["superadmin", "support"]);
export const staffRoleEnum = pgEnum("staff_role", ["admin", "manager", "staff"]);
export const menuCategoryEnum = pgEnum("menu_category", ["coffee", "pastries", "bread", "food", "drinks", "snacks", "merchandise", "seasonal"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "ready", "completed", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["online", "pickup"]);
export const loyaltyTypeEnum = pgEnum("loyalty_type", ["earn", "redeem"]);
export const paymentTermsEnum = pgEnum("payment_terms", ["prepaid", "net_7", "net_14", "net_30"]);
export const cateringStatusEnum = pgEnum("catering_status", ["new", "quoted", "confirmed", "completed"]);

// ─── Venues (Tenants) ───
export const venues = pgTable("venues", {
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
  subscriptionTier: subscriptionTierEnum("subscription_tier").default("starter"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").default("trial"),
  trialEndsAt: timestamp("trial_ends_at"),

  // Settings
  settingsJson: json("settings_json"),

  // Website builder
  heroImageUrl: varchar("hero_image_url", { length: 500 }),
  tagline: varchar("tagline", { length: 255 }),
  aboutTitle: varchar("about_title", { length: 255 }),
  aboutText: text("about_text"),
  galleryImages: json("gallery_images"),
  websiteBlocks: json("website_blocks"),
  instagramUrl: varchar("instagram_url", { length: 255 }),
  facebookUrl: varchar("facebook_url", { length: 255 }),

  // Tablet POS PIN (4-6 digits, set by owner, used for counter iPad access)
  tabletPin: varchar("tablet_pin", { length: 8 }),

  // Status
  isActive: boolean("is_active").default(true),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});
export type Venue = typeof venues.$inferSelect;

// ─── Venue Owners (Platform Users who own/manage venues) ───
export const venueOwners = pgTable("venue_owners", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: ownerRoleEnum("role").default("owner"),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Platform Admins (B1 Platform staff) ───
export const platformAdmins = pgTable("platform_admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: adminRoleEnum("role").default("support"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Locations (per-venue) ───
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
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
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: menuCategoryEnum("category").notNull(),
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
  squareCatalogId: varchar("square_catalog_id", { length: 50 }),
  activeFrom: timestamp("active_from"),
  activeTo: timestamp("active_to"),
  isLimitedTime: boolean("is_limited_time").default(false),
  limitedTimeLabel: varchar("limited_time_label", { length: 64 }),
  allergens: json("allergens").$type<string[]>().default([]),
  dietaryTags: json("dietary_tags").$type<string[]>().default([]),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MenuItem = typeof menuItems.$inferSelect;

// ─── Inventory (per-venue) ───
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  menuItemId: bigint("menu_item_id", { mode: "number" }).notNull().references(() => menuItems.id),
  isAvailable: boolean("is_available").notNull().default(true),
  soldOutAt: timestamp("sold_out_at"),
  restockedAt: timestamp("restocked_at"),
  staffNote: text("staff_note"),
  quantity: integer("quantity"),
  quantityAlert: integer("quantity_alert"),
  lastRestockedAt: timestamp("last_restocked_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Bundles (per-venue) ───
export const bundles = pgTable("bundles", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  itemSlugs: text("item_slugs").notNull(),
  bundlePrice: numeric("bundle_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Staff Accounts (per-venue) ───
export const staffAccounts = pgTable("staff_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  name: varchar("name", { length: 255 }).notNull(),
  username: varchar("username", { length: 64 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: staffRoleEnum("role").default("staff").notNull(),
  isActive: boolean("is_active").default(true),
  lastLoginAt: timestamp("last_login_at"),
  email: varchar("email", { length: 320 }),
  twoFaEnabled: boolean("two_fa_enabled").default(false),
  emailVerified: boolean("email_verified").default(false),
  emailVerifyToken: varchar("email_verify_token", { length: 64 }),
  emailVerifyExpiry: timestamp("email_verify_expiry"),
  resetToken: varchar("reset_token", { length: 64 }),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  phone: varchar("phone", { length: 32 }),
  employmentType: varchar("employment_type", { length: 16 }).default("casual").$type<"full_time" | "part_time" | "casual">(),
  hourlyRate: numeric("hourly_rate", { precision: 8, scale: 2 }),
  emergencyContact: varchar("emergency_contact", { length: 255 }),
  emergencyPhone: varchar("emergency_phone", { length: 32 }),
  clockPin: varchar("clock_pin", { length: 8 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type StaffAccount = typeof staffAccounts.$inferSelect;

// ─── Orders (per-venue) ───
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  orderNumber: varchar("order_number", { length: 32 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  pickupTime: varchar("pickup_time", { length: 32 }).notNull(),
  orderNote: text("order_note"),
  staffNote: text("staff_note"),
  paymentMethod: paymentMethodEnum("payment_method").default("pickup").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  locationId: bigint("location_id", { mode: "number" }),
  squareOrderId: varchar("square_order_id", { length: 50 }),
  customerEmail: varchar("customer_email", { length: 320 }),
  tipAmount: numeric("tip_amount", { precision: 10, scale: 2 }).default("0"),
  discountCode: varchar("discount_code", { length: 32 }),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0"),
  stripeSessionId: varchar("stripe_session_id", { length: 100 }),
  tableNumber: varchar("table_number", { length: 16 }),
  orderType: varchar("order_type", { length: 16 }).default("pickup"),
  refundedAt: timestamp("refunded_at"),
  refundAmount: varchar("refund_amount", { length: 16 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  // Critical for all analytics/KDS queries — covered by nearly every lookup
  index("orders_venue_id_created_at_idx").on(t.venueId, t.createdAt),
  index("orders_venue_id_status_idx").on(t.venueId, t.status),
  index("orders_stripe_session_id_idx").on(t.stripeSessionId),
  index("orders_customer_phone_idx").on(t.customerPhone),
  index("orders_order_number_idx").on(t.orderNumber),
]);
export type Order = typeof orders.$inferSelect;

// ─── Order Items ───
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull().references(() => orders.id),
  menuItemId: bigint("menu_item_id", { mode: "number" }).notNull().references(() => menuItems.id),
  itemName: varchar("item_name", { length: 128 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Loyalty (per-venue) ───
export const loyaltyAccounts = pgTable("loyalty_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  name: varchar("name", { length: 255 }),
  pointsBalance: integer("points_balance").notNull().default(0),
  totalLifetimePoints: integer("total_lifetime_points").notNull().default(0),
  coffeesRedeemed: integer("coffees_redeemed").notNull().default(0),
  pastriesRedeemed: integer("pastries_redeemed").notNull().default(0),
  breadRedeemed: integer("bread_redeemed").notNull().default(0),
  referralCredit: numeric("referral_credit", { precision: 10, scale: 2 }).notNull().default("0"),
  birthday: varchar("birthday", { length: 5 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
}, (t) => [
  index("loyalty_accounts_venue_phone_idx").on(t.venueId, t.phone),
]);

// ─── Loyalty Transactions ───
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  accountId: bigint("account_id", { mode: "number" }).notNull().references(() => loyaltyAccounts.id),
  type: loyaltyTypeEnum("type").notNull(),
  points: integer("points").notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customer Preferences (per-venue) ───
export const customerPreferences = pgTable("customer_preferences", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  milk: varchar("milk", { length: 32 }),
  temperature: varchar("temperature", { length: 32 }),
  sugar: varchar("sugar", { length: 32 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Subscription Passes (per-venue) ───
export const subscriptionPasses = pgTable("subscription_passes", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  totalCredits: integer("total_credits").notNull(),
  remainingCredits: integer("remaining_credits").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Referral Codes (per-venue) ───
export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  code: varchar("code", { length: 16 }).notNull(),
  referrerPhone: varchar("referrer_phone", { length: 32 }).notNull(),
  referrerName: varchar("referrer_name", { length: 255 }),
  creditEarned: numeric("credit_earned", { precision: 10, scale: 2 }).notNull().default("0"),
  uses: integer("uses").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Gift Cards (per-venue) ───
export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  code: varchar("code", { length: 16 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  recipientName: varchar("recipient_name", { length: 255 }),
  recipientEmail: varchar("recipient_email", { length: 320 }),
  recipientPhone: varchar("recipient_phone", { length: 32 }),
  message: text("message"),
  isRedeemed: boolean("is_redeemed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Reviews (per-venue) ───
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  orderId: bigint("order_id", { mode: "number" }).notNull().references(() => orders.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  ownerReply: text("owner_reply"),
  ownerRepliedAt: timestamp("owner_replied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("reviews_venue_id_idx").on(t.venueId),
]);

// ─── Corporate Accounts (per-venue) ───
export const corporateAccounts = pgTable("corporate_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 32 }).notNull(),
  contactEmail: varchar("contact_email", { length: 320 }),
  billingAddress: text("billing_address"),
  paymentTerms: paymentTermsEnum("payment_terms").default("net_7"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Catering Requests (per-venue) ───
export const cateringRequests = pgTable("catering_requests", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  email: varchar("email", { length: 320 }),
  eventDate: varchar("event_date", { length: 32 }).notNull(),
  guestCount: integer("guest_count").notNull(),
  details: text("details"),
  status: cateringStatusEnum("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Discount Codes (per-venue) ───
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  code: varchar("code", { length: 32 }).notNull(),
  type: varchar("type", { length: 16 }).notNull().$type<"percentage" | "fixed">(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type DiscountCode = typeof discountCodes.$inferSelect;

// ─── Menu Item Modifiers (per-venue, per-item) ───
// Modifier groups — e.g. "Milk Type" with options [Oat, Almond, Regular]
export const menuItemModifiers = pgTable("menu_item_modifiers", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  menuItemId: bigint("menu_item_id", { mode: "number" }).notNull().references(() => menuItems.id),
  name: varchar("name", { length: 64 }).notNull(),
  options: json("options").notNull().$type<{ name: string; priceAdj: number }[]>(),
  required: boolean("required").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MenuItemModifier = typeof menuItemModifiers.$inferSelect;

// ─── Push Subscriptions (per-venue) ───
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Customer Accounts (cross-device loyalty login) ───
export const customerAccounts = pgTable("customer_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  email: varchar("email", { length: 320 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
  birthday: varchar("birthday", { length: 5 }),
  allergies: text("allergies"),
  marketingOptIn: boolean("marketing_opt_in").default(false),
});

// ─── Abandoned Carts (per-venue) ───
export const abandonedCarts = pgTable("abandoned_carts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  customerName: varchar("customer_name", { length: 255 }),
  itemsJson: text("items_json").notNull(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  isRecovered: boolean("is_recovered").default(false),
  recoverySentAt: timestamp("recovery_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
});

// ─── Staff Shifts (scheduling) ───
export const staffShifts = pgTable("staff_shifts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  staffId: bigint("staff_id", { mode: "number" }).notNull().references(() => staffAccounts.id),
  shiftDate: varchar("shift_date", { length: 10 }).notNull(), // YYYY-MM-DD
  startTime: varchar("start_time", { length: 5 }).notNull(),  // HH:MM
  endTime: varchar("end_time", { length: 5 }).notNull(),
  role: varchar("role", { length: 64 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Loyalty Rewards Catalogue (per-venue) ───
export const loyaltyRewards = pgTable("loyalty_rewards", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  pointsCost: integer("points_cost").notNull(),
  rewardType: varchar("reward_type", { length: 32 }).notNull().$type<"free_item" | "discount_percent" | "discount_fixed" | "custom">(),
  rewardValue: varchar("reward_value", { length: 64 }),
  menuItemSlug: varchar("menu_item_slug", { length: 64 }),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Campaign Messages (email/SMS marketing) ───
export const campaignMessages = pgTable("campaign_messages", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  name: varchar("name", { length: 128 }).notNull(),
  type: varchar("type", { length: 8 }).notNull().$type<"email" | "sms">(),
  subject: varchar("subject", { length: 255 }),
  body: text("body").notNull(),
  segment: varchar("segment", { length: 32 }).notNull().$type<"all" | "active_30d" | "high_value">(),
  sentAt: timestamp("sent_at"),
  recipientCount: integer("recipient_count").default(0),
  status: varchar("status", { length: 16 }).notNull().default("draft").$type<"draft" | "sent">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── NPS Responses ───
export const npsResponses = pgTable("nps_responses", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id),
  phone: varchar("phone", { length: 32 }),
  score: integer("score").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Waste Log (per-venue) ───
export const wasteLog = pgTable("waste_log", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  menuItemId: bigint("menu_item_id", { mode: "number" }).references(() => menuItems.id),
  itemName: varchar("item_name", { length: 128 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  reason: varchar("reason", { length: 128 }).notNull(),
  costEstimate: numeric("cost_estimate", { precision: 10, scale: 2 }),
  staffId: bigint("staff_id", { mode: "number" }).references(() => staffAccounts.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Waitlist Entries (dine-in virtual queue) ───
export const waitlistEntries = pgTable("waitlist_entries", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  name: varchar("name", { length: 128 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  partySize: integer("party_size").notNull().default(1),
  note: text("note"),
  status: varchar("status", { length: 16 }).notNull().default("waiting").$type<"waiting" | "notified" | "seated" | "left">(),
  position: integer("position").notNull(),
  estimatedWait: integer("estimated_wait"),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Webhook Subscriptions (Zapier/custom integrations) ───
export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  url: text("url").notNull(),
  events: json("events").notNull().$type<string[]>(),
  secret: varchar("secret", { length: 64 }),
  isActive: boolean("is_active").default(true),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Xero Connections (accounting integration) ───
export const xeroConnections = pgTable("xero_connections", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().unique().references(() => venues.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tenantId: varchar("tenant_id", { length: 64 }),
  tokenExpiresAt: timestamp("token_expires_at"),
  lastSyncAt: timestamp("last_sync_at"),
  isConnected: boolean("is_connected").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Reservations (per-venue) ───
export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  customerEmail: varchar("customer_email", { length: 320 }),
  partySize: integer("party_size").notNull().default(2),
  reservationDate: varchar("reservation_date", { length: 10 }).notNull(), // YYYY-MM-DD
  reservationTime: varchar("reservation_time", { length: 5 }).notNull(),  // HH:MM
  notes: text("notes"),
  status: varchar("status", { length: 16 }).notNull().default("pending")
    .$type<"pending" | "confirmed" | "seated" | "cancelled" | "no_show">(),
  confirmationSentAt: timestamp("confirmation_sent_at"),
  tableId: bigint("table_id", { mode: "number" }).references(() => venueTables.id),
  smsReminderSentAt: timestamp("sms_reminder_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Favourite Orders (per-venue) ───
export const favouriteOrders = pgTable("favourite_orders", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  label: varchar("label", { length: 128 }).notNull(), // e.g. "My usual"
  itemsJson: text("items_json").notNull(), // JSON array of cart items
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
  orderCount: integer("order_count").default(1), // how many times reordered
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
});

// ─── Group Orders (per-venue) ───
export const groupOrders = pgTable("group_orders", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  sessionCode: varchar("session_code", { length: 8 }).notNull(), // e.g. "CAFE4821"
  hostPhone: varchar("host_phone", { length: 32 }).notNull(),
  hostName: varchar("host_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("open")
    .$type<"open" | "locked" | "paid" | "cancelled">(),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).default("0"),
  expiresAt: timestamp("expires_at").notNull(),
  orderId: bigint("order_id", { mode: "number" }).references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groupOrderParticipants = pgTable("group_order_participants", {
  id: serial("id").primaryKey(),
  groupOrderId: bigint("group_order_id", { mode: "number" }).notNull().references(() => groupOrders.id),
  participantName: varchar("participant_name", { length: 255 }).notNull(),
  participantPhone: varchar("participant_phone", { length: 32 }),
  itemsJson: text("items_json").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

// ─── POS Integrations (Lightspeed, Tyro, Impos, etc.) ───
export const posIntegrations = pgTable("pos_integrations", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  provider: varchar("provider", { length: 32 }).notNull().$type<"lightspeed" | "tyro" | "impos" | "revel">(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accountId: varchar("account_id", { length: 128 }),
  locationId: varchar("location_id", { length: 128 }),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").default(false),
  lastSyncAt: timestamp("last_sync_at"),
  settingsJson: json("settings_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Staff Clock Events (in/out tracking) ───
export const staffClockEvents = pgTable("staff_clock_events", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  staffId: bigint("staff_id", { mode: "number" }).notNull().references(() => staffAccounts.id),

  eventType: varchar("event_type", { length: 16 }).notNull().$type<"in" | "out" | "break_start" | "break_end">(),
  clockedAt: timestamp("clocked_at").defaultNow().notNull(),
  note: text("note"),
});

// ─── Audit Log ───
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).references(() => venues.id),
  actorId: bigint("actor_id", { mode: "number" }),
  actorType: varchar("actor_type", { length: 16 }).$type<"owner" | "staff" | "system">(),
  actorName: varchar("actor_name", { length: 255 }),
  action: varchar("action", { length: 64 }).notNull(),
  entityType: varchar("entity_type", { length: 64 }),
  entityId: bigint("entity_id", { mode: "number" }),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Delivery Orders (Uber Eats / DoorDash / Menulog) ───
export const deliveryOrders = pgTable("delivery_orders", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  platform: varchar("platform", { length: 32 }).notNull().$type<"uber_eats" | "doordash" | "menulog" | "manual">(),
  externalId: varchar("external_id", { length: 128 }),
  customerName: varchar("customer_name", { length: 255 }),
  itemsJson: text("items_json").notNull(),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).default("0"),
  netRevenue: numeric("net_revenue", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("received").$type<"received" | "preparing" | "ready" | "picked_up" | "cancelled">(),
  notes: text("notes"),
  orderedAt: timestamp("ordered_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Venue Tables (floor plan) ───
export const venueTables = pgTable("venue_tables", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  tableNumber: varchar("table_number", { length: 16 }).notNull(),
  capacity: integer("capacity").notNull().default(4),
  x: integer("x").default(0),       // floor plan position
  y: integer("y").default(0),
  width: integer("width").default(80),
  height: integer("height").default(80),
  shape: varchar("shape", { length: 8 }).default("rect").$type<"rect" | "round">(),
  section: varchar("section", { length: 64 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Staff Training Tasks ───
export const staffTrainingTasks = pgTable("staff_training_tasks", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  requiredRole: staffRoleEnum("required_role"),  // null = all roles
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const staffTrainingCompletions = pgTable("staff_training_completions", {
  id: serial("id").primaryKey(),
  taskId: bigint("task_id", { mode: "number" }).notNull().references(() => staffTrainingTasks.id),
  staffId: bigint("staff_id", { mode: "number" }).notNull().references(() => staffAccounts.id),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  signedOffBy: bigint("signed_off_by", { mode: "number" }).references(() => staffAccounts.id),
  signedOffAt: timestamp("signed_off_at"),
  notes: text("notes"),
});

// ─── Franchisee Accounts ───
export const franchiseeAccounts = pgTable("franchisee_accounts", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  ownerId: bigint("owner_id", { mode: "number" }).notNull().references(() => venueOwners.id),
  platformFeePercent: numeric("platform_fee_percent", { precision: 5, scale: 2 }).notNull().default("3.00"),
  stripeConnectAccountId: varchar("stripe_connect_account_id", { length: 128 }),
  payoutSchedule: varchar("payout_schedule", { length: 16 }).default("monthly").$type<"weekly" | "fortnightly" | "monthly">(),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const franchiseePayouts = pgTable("franchisee_payouts", {
  id: serial("id").primaryKey(),
  franchiseeId: bigint("franchisee_id", { mode: "number" }).notNull().references(() => franchiseeAccounts.id),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  grossRevenue: numeric("gross_revenue", { precision: 12, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 12, scale: 2 }).notNull(),
  netPayout: numeric("net_payout", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending").$type<"pending" | "processing" | "paid" | "failed">(),
  stripePayoutId: varchar("stripe_payout_id", { length: 128 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Staff 2FA Tokens ───
export const staffTwoFaTokens = pgTable("staff_two_fa_tokens", {
  id: serial("id").primaryKey(),
  staffId: bigint("staff_id", { mode: "number" }).notNull().references(() => staffAccounts.id),
  code: varchar("code", { length: 6 }).notNull(),
  purpose: varchar("purpose", { length: 16 }).notNull().$type<"login" | "verify_email" | "reset_password">(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Staff Availability Preferences ───
export const staffAvailability = pgTable("staff_availability", {
  id: serial("id").primaryKey(),
  staffId: bigint("staff_id", { mode: "number" }).notNull().references(() => staffAccounts.id),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sun, 6=Sat
  available: boolean("available").default(true),
  preferredStartTime: varchar("preferred_start_time", { length: 5 }), // "09:00"
  preferredEndTime: varchar("preferred_end_time", { length: 5 }),
  note: text("note"),
});

// ─── Shift Swap Requests ───
export const shiftSwapRequests = pgTable("shift_swap_requests", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  requestingStaffId: bigint("requesting_staff_id", { mode: "number" }).notNull().references(() => staffAccounts.id),
  fromShiftId: bigint("from_shift_id", { mode: "number" }).notNull().references(() => staffShifts.id),
  targetStaffId: bigint("target_staff_id", { mode: "number" }).references(() => staffAccounts.id),
  targetShiftId: bigint("target_shift_id", { mode: "number" }).references(() => staffShifts.id),
  reason: text("reason"),
  status: varchar("status", { length: 16 }).notNull().default("pending").$type<"pending" | "approved" | "denied">(),
  reviewedBy: bigint("reviewed_by", { mode: "number" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Time Off Requests ───
export const timeOffRequests = pgTable("time_off_requests", {
  id: serial("id").primaryKey(),
  staffId: bigint("staff_id", { mode: "number" }).notNull().references(() => staffAccounts.id),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  startDate: varchar("start_date", { length: 10 }).notNull(), // "YYYY-MM-DD"
  endDate: varchar("end_date", { length: 10 }).notNull(),
  leaveType: varchar("leave_type", { length: 16 }).notNull().default("annual").$type<"annual" | "sick" | "unpaid" | "other">(),
  reason: text("reason"),
  status: varchar("status", { length: 16 }).notNull().default("pending").$type<"pending" | "approved" | "denied">(),
  reviewedBy: bigint("reviewed_by", { mode: "number" }),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Recurring Orders (subscription ordering) ───
export const recurringOrders = pgTable("recurring_orders", {
  id: serial("id").primaryKey(),
  venueId: bigint("venue_id", { mode: "number" }).notNull().references(() => venues.id),
  customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
  customerName: varchar("customer_name", { length: 128 }).notNull(),
  items: json("items").$type<{ menuItemId: number; quantity: number }[]>().notNull(),
  scheduleDays: varchar("schedule_days", { length: 20 }).notNull(), // "1,2,3,4,5" = Mon-Fri
  pickupTime: varchar("pickup_time", { length: 8 }).notNull(),       // "08:30"
  isActive: boolean("is_active").default(true).notNull(),
  nextOrderAt: timestamp("next_order_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
