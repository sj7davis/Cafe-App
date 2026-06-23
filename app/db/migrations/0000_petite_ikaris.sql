CREATE TYPE "public"."admin_role" AS ENUM('superadmin', 'support');--> statement-breakpoint
CREATE TYPE "public"."catering_status" AS ENUM('new', 'quoted', 'confirmed', 'completed');--> statement-breakpoint
CREATE TYPE "public"."loyalty_type" AS ENUM('earn', 'redeem');--> statement-breakpoint
CREATE TYPE "public"."menu_category" AS ENUM('coffee', 'pastries', 'bread', 'food', 'drinks', 'snacks', 'merchandise', 'seasonal');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'ready', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."owner_role" AS ENUM('owner', 'manager');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('online', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."payment_terms" AS ENUM('prepaid', 'net_7', 'net_14', 'net_30');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'manager', 'staff');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trial', 'active', 'past_due', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('starter', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "abandoned_carts" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"phone" varchar(32),
	"email" varchar(320),
	"customer_name" varchar(255),
	"items_json" text NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"is_recovered" boolean DEFAULT false,
	"recovery_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint,
	"actor_id" bigint,
	"actor_type" varchar(16),
	"actor_name" varchar(255),
	"action" varchar(64) NOT NULL,
	"entity_type" varchar(64),
	"entity_id" bigint,
	"details" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"item_slugs" text NOT NULL,
	"bundle_price" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" varchar(8) NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"segment" varchar(32) NOT NULL,
	"sent_at" timestamp,
	"recipient_count" integer DEFAULT 0,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catering_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(320),
	"event_date" varchar(32) NOT NULL,
	"guest_count" integer NOT NULL,
	"details" text,
	"status" "catering_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corporate_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"contact_phone" varchar(32) NOT NULL,
	"contact_email" varchar(320),
	"billing_address" text,
	"payment_terms" "payment_terms" DEFAULT 'net_7',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"phone" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"birthday" varchar(5),
	"allergies" text,
	"marketing_opt_in" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "customer_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"phone" varchar(32) NOT NULL,
	"milk" varchar(32),
	"temperature" varchar(32),
	"sugar" varchar(32),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"platform" varchar(32) NOT NULL,
	"external_id" varchar(128),
	"customer_name" varchar(255),
	"items_json" text NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0',
	"net_revenue" numeric(10, 2) NOT NULL,
	"status" varchar(16) DEFAULT 'received' NOT NULL,
	"notes" text,
	"ordered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"code" varchar(32) NOT NULL,
	"type" varchar(16) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"min_order_amount" numeric(10, 2),
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favourite_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"label" varchar(128) NOT NULL,
	"items_json" text NOT NULL,
	"total_amount" numeric(10, 2),
	"order_count" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "franchisee_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"owner_id" bigint NOT NULL,
	"platform_fee_percent" numeric(5, 2) DEFAULT '3.00' NOT NULL,
	"stripe_connect_account_id" varchar(128),
	"payout_schedule" varchar(16) DEFAULT 'monthly',
	"is_active" boolean DEFAULT true,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchisee_payouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"franchisee_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"gross_revenue" numeric(12, 2) NOT NULL,
	"platform_fee" numeric(12, 2) NOT NULL,
	"net_payout" numeric(12, 2) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"stripe_payout_id" varchar(128),
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"code" varchar(16) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"balance" numeric(10, 2) NOT NULL,
	"sender_name" varchar(255),
	"recipient_name" varchar(255),
	"recipient_email" varchar(320),
	"recipient_phone" varchar(32),
	"message" text,
	"is_redeemed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_order_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_order_id" bigint NOT NULL,
	"participant_name" varchar(255) NOT NULL,
	"participant_phone" varchar(32),
	"items_json" text NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"session_code" varchar(8) NOT NULL,
	"host_phone" varchar(32) NOT NULL,
	"host_name" varchar(255) NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"total_amount" numeric(10, 2) DEFAULT '0',
	"expires_at" timestamp NOT NULL,
	"order_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"menu_item_id" bigint NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sold_out_at" timestamp,
	"restocked_at" timestamp,
	"staff_note" text,
	"quantity" integer,
	"quantity_alert" integer,
	"last_restocked_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" varchar(128) NOT NULL,
	"address" varchar(255) NOT NULL,
	"phone" varchar(32),
	"is_default" boolean DEFAULT false,
	"hours_weekday" varchar(64),
	"hours_saturday" varchar(64),
	"hours_sunday" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"phone" varchar(32) NOT NULL,
	"name" varchar(255),
	"points_balance" integer DEFAULT 0 NOT NULL,
	"total_lifetime_points" integer DEFAULT 0 NOT NULL,
	"coffees_redeemed" integer DEFAULT 0 NOT NULL,
	"pastries_redeemed" integer DEFAULT 0 NOT NULL,
	"bread_redeemed" integer DEFAULT 0 NOT NULL,
	"referral_credit" numeric(10, 2) DEFAULT '0' NOT NULL,
	"birthday" varchar(5),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"points_cost" integer NOT NULL,
	"reward_type" varchar(32) NOT NULL,
	"reward_value" varchar(64),
	"menu_item_slug" varchar(64),
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"account_id" bigint NOT NULL,
	"type" "loyalty_type" NOT NULL,
	"points" integer NOT NULL,
	"description" varchar(255) NOT NULL,
	"order_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_modifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"menu_item_id" bigint NOT NULL,
	"name" varchar(64) NOT NULL,
	"options" json NOT NULL,
	"required" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"category" "menu_category" NOT NULL,
	"dietary" text,
	"image" varchar(255),
	"is_daily_special" boolean DEFAULT false,
	"is_limited" boolean DEFAULT false,
	"origin_region" varchar(255),
	"origin_farm" varchar(255),
	"origin_altitude" varchar(64),
	"origin_process" varchar(128),
	"origin_tasting_notes" text,
	"origin_story" text,
	"square_catalog_id" varchar(50),
	"active_from" timestamp,
	"active_to" timestamp,
	"is_limited_time" boolean DEFAULT false,
	"limited_time_label" varchar(64),
	"allergens" json DEFAULT '[]'::json,
	"dietary_tags" json DEFAULT '[]'::json,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nps_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"order_id" bigint,
	"phone" varchar(32),
	"score" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"menu_item_id" bigint NOT NULL,
	"item_name" varchar(128) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"order_number" varchar(32) NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"pickup_time" varchar(32) NOT NULL,
	"order_note" text,
	"staff_note" text,
	"payment_method" "payment_method" DEFAULT 'pickup' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"location_id" bigint,
	"square_order_id" varchar(50),
	"customer_email" varchar(320),
	"tip_amount" numeric(10, 2) DEFAULT '0',
	"discount_code" varchar(32),
	"discount_amount" numeric(10, 2) DEFAULT '0',
	"stripe_session_id" varchar(100),
	"table_number" varchar(16),
	"order_type" varchar(16) DEFAULT 'pickup',
	"refunded_at" timestamp,
	"refund_amount" varchar(16),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255),
	"password_hash" varchar(255) NOT NULL,
	"role" "admin_role" DEFAULT 'support',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pos_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"provider" varchar(32) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"account_id" varchar(128),
	"location_id" varchar(128),
	"token_expires_at" timestamp,
	"is_active" boolean DEFAULT false,
	"last_sync_at" timestamp,
	"settings_json" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"phone" varchar(32),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"customer_name" varchar(128) NOT NULL,
	"items" json NOT NULL,
	"schedule_days" varchar(20) NOT NULL,
	"pickup_time" varchar(8) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"next_order_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"code" varchar(16) NOT NULL,
	"referrer_phone" varchar(32) NOT NULL,
	"referrer_name" varchar(255),
	"credit_earned" numeric(10, 2) DEFAULT '0' NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"customer_email" varchar(320),
	"party_size" integer DEFAULT 2 NOT NULL,
	"reservation_date" varchar(10) NOT NULL,
	"reservation_time" varchar(5) NOT NULL,
	"notes" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"confirmation_sent_at" timestamp,
	"table_id" bigint,
	"sms_reminder_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"order_id" bigint NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"owner_reply" text,
	"owner_replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift_swap_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"requesting_staff_id" bigint NOT NULL,
	"from_shift_id" bigint NOT NULL,
	"target_staff_id" bigint,
	"target_shift_id" bigint,
	"reason" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"reviewed_by" bigint,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" varchar(255) NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "staff_role" DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"email" varchar(320),
	"two_fa_enabled" boolean DEFAULT false,
	"email_verified" boolean DEFAULT false,
	"email_verify_token" varchar(64),
	"email_verify_expiry" timestamp,
	"reset_token" varchar(64),
	"reset_token_expiry" timestamp,
	"phone" varchar(32),
	"employment_type" varchar(16) DEFAULT 'casual',
	"hourly_rate" numeric(8, 2),
	"emergency_contact" varchar(255),
	"emergency_phone" varchar(32),
	"clock_pin" varchar(8),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"day_of_week" integer NOT NULL,
	"available" boolean DEFAULT true,
	"preferred_start_time" varchar(5),
	"preferred_end_time" varchar(5),
	"note" text
);
--> statement-breakpoint
CREATE TABLE "staff_clock_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"staff_id" bigint NOT NULL,
	"event_type" varchar(16) NOT NULL,
	"clocked_at" timestamp DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "staff_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"staff_id" bigint NOT NULL,
	"shift_date" varchar(10) NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"role" varchar(64),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_training_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" bigint NOT NULL,
	"staff_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"signed_off_by" bigint,
	"signed_off_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "staff_training_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"required_role" "staff_role",
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_two_fa_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" bigint NOT NULL,
	"code" varchar(6) NOT NULL,
	"purpose" varchar(16) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_passes" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"phone" varchar(32) NOT NULL,
	"name" varchar(128) NOT NULL,
	"total_credits" integer NOT NULL,
	"remaining_credits" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" bigint NOT NULL,
	"venue_id" bigint NOT NULL,
	"start_date" varchar(10) NOT NULL,
	"end_date" varchar(10) NOT NULL,
	"leave_type" varchar(16) DEFAULT 'annual' NOT NULL,
	"reason" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"reviewed_by" bigint,
	"reviewed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"email" varchar(320) NOT NULL,
	"name" varchar(255),
	"password_hash" varchar(255),
	"role" "owner_role" DEFAULT 'owner',
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_tables" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"table_number" varchar(16) NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"x" integer DEFAULT 0,
	"y" integer DEFAULT 0,
	"width" integer DEFAULT 80,
	"height" integer DEFAULT 80,
	"shape" varchar(8) DEFAULT 'rect',
	"section" varchar(64),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"subdomain" varchar(50),
	"custom_domain" varchar(100),
	"logo_url" varchar(500),
	"primary_color" varchar(7) DEFAULT '#181818',
	"accent_color" varchar(7) DEFAULT '#5E8B8B',
	"description" text,
	"address" varchar(255),
	"phone" varchar(32),
	"hours_weekday" varchar(64),
	"hours_saturday" varchar(64),
	"hours_sunday" varchar(64),
	"square_merchant_id" varchar(50),
	"square_location_id" varchar(50),
	"square_access_token" text,
	"square_refresh_token" text,
	"square_token_expires_at" timestamp,
	"square_enabled" boolean DEFAULT false,
	"stripe_customer_id" varchar(100),
	"stripe_subscription_id" varchar(100),
	"subscription_tier" "subscription_tier" DEFAULT 'starter',
	"subscription_status" "subscription_status" DEFAULT 'trial',
	"trial_ends_at" timestamp,
	"settings_json" json,
	"hero_image_url" varchar(500),
	"tagline" varchar(255),
	"about_title" varchar(255),
	"about_text" text,
	"gallery_images" json,
	"website_blocks" json,
	"instagram_url" varchar(255),
	"facebook_url" varchar(255),
	"tablet_pin" varchar(8),
	"is_active" boolean DEFAULT true,
	"is_public" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venues_slug_unique" UNIQUE("slug"),
	CONSTRAINT "venues_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"name" varchar(128) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"note" text,
	"status" varchar(16) DEFAULT 'waiting' NOT NULL,
	"position" integer NOT NULL,
	"estimated_wait" integer,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waste_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"menu_item_id" bigint,
	"item_name" varchar(128) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"reason" varchar(128) NOT NULL,
	"cost_estimate" numeric(10, 2),
	"staff_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"url" text NOT NULL,
	"events" json NOT NULL,
	"secret" varchar(64),
	"is_active" boolean DEFAULT true,
	"last_triggered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xero_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" bigint NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"tenant_id" varchar(64),
	"token_expires_at" timestamp,
	"last_sync_at" timestamp,
	"is_connected" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "xero_connections_venue_id_unique" UNIQUE("venue_id")
);
--> statement-breakpoint
ALTER TABLE "abandoned_carts" ADD CONSTRAINT "abandoned_carts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundles" ADD CONSTRAINT "bundles_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_messages" ADD CONSTRAINT "campaign_messages_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catering_requests" ADD CONSTRAINT "catering_requests_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corporate_accounts" ADD CONSTRAINT "corporate_accounts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_accounts" ADD CONSTRAINT "customer_accounts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_orders" ADD CONSTRAINT "delivery_orders_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourite_orders" ADD CONSTRAINT "favourite_orders_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchisee_accounts" ADD CONSTRAINT "franchisee_accounts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchisee_accounts" ADD CONSTRAINT "franchisee_accounts_owner_id_venue_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."venue_owners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchisee_payouts" ADD CONSTRAINT "franchisee_payouts_franchisee_id_franchisee_accounts_id_fk" FOREIGN KEY ("franchisee_id") REFERENCES "public"."franchisee_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchisee_payouts" ADD CONSTRAINT "franchisee_payouts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_order_participants" ADD CONSTRAINT "group_order_participants_group_order_id_group_orders_id_fk" FOREIGN KEY ("group_order_id") REFERENCES "public"."group_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_orders" ADD CONSTRAINT "group_orders_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_orders" ADD CONSTRAINT "group_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifiers" ADD CONSTRAINT "menu_item_modifiers_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_modifiers" ADD CONSTRAINT "menu_item_modifiers_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nps_responses" ADD CONSTRAINT "nps_responses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_integrations" ADD CONSTRAINT "pos_integrations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_orders" ADD CONSTRAINT "recurring_orders_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_venue_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."venue_tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_requesting_staff_id_staff_accounts_id_fk" FOREIGN KEY ("requesting_staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_from_shift_id_staff_shifts_id_fk" FOREIGN KEY ("from_shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_target_staff_id_staff_accounts_id_fk" FOREIGN KEY ("target_staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_target_shift_id_staff_shifts_id_fk" FOREIGN KEY ("target_shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_accounts" ADD CONSTRAINT "staff_accounts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_availability" ADD CONSTRAINT "staff_availability_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_clock_events" ADD CONSTRAINT "staff_clock_events_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_clock_events" ADD CONSTRAINT "staff_clock_events_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_shifts" ADD CONSTRAINT "staff_shifts_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_training_completions" ADD CONSTRAINT "staff_training_completions_task_id_staff_training_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."staff_training_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_training_completions" ADD CONSTRAINT "staff_training_completions_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_training_completions" ADD CONSTRAINT "staff_training_completions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_training_completions" ADD CONSTRAINT "staff_training_completions_signed_off_by_staff_accounts_id_fk" FOREIGN KEY ("signed_off_by") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_training_tasks" ADD CONSTRAINT "staff_training_tasks_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_two_fa_tokens" ADD CONSTRAINT "staff_two_fa_tokens_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_passes" ADD CONSTRAINT "subscription_passes_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_owners" ADD CONSTRAINT "venue_owners_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venue_tables" ADD CONSTRAINT "venue_tables_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_log" ADD CONSTRAINT "waste_log_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_log" ADD CONSTRAINT "waste_log_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_log" ADD CONSTRAINT "waste_log_staff_id_staff_accounts_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xero_connections" ADD CONSTRAINT "xero_connections_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "loyalty_accounts_venue_phone_idx" ON "loyalty_accounts" USING btree ("venue_id","phone");--> statement-breakpoint
CREATE INDEX "orders_venue_id_created_at_idx" ON "orders" USING btree ("venue_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_venue_id_status_idx" ON "orders" USING btree ("venue_id","status");--> statement-breakpoint
CREATE INDEX "orders_stripe_session_id_idx" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "orders_customer_phone_idx" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "orders_order_number_idx" ON "orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "reviews_venue_id_idx" ON "reviews" USING btree ("venue_id");