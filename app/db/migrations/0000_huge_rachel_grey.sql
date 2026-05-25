CREATE TABLE `bundles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`item_slugs` text NOT NULL,
	`bundle_price` decimal(10,2) NOT NULL,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bundles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `catering_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(320),
	`event_date` varchar(32) NOT NULL,
	`guest_count` int NOT NULL,
	`details` text,
	`status` enum('new','quoted','confirmed','completed') NOT NULL DEFAULT 'new',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `catering_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `corporate_accounts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`company_name` varchar(255) NOT NULL,
	`contact_name` varchar(255) NOT NULL,
	`contact_phone` varchar(32) NOT NULL,
	`contact_email` varchar(320),
	`billing_address` text,
	`payment_terms` enum('prepaid','net_7','net_14','net_30') DEFAULT 'net_7',
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `corporate_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_preferences` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`phone` varchar(32) NOT NULL,
	`milk` varchar(32),
	`temperature` varchar(32),
	`sugar` varchar(32),
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_preferences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gift_cards` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`code` varchar(16) NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balance` decimal(10,2) NOT NULL,
	`sender_name` varchar(255),
	`recipient_name` varchar(255),
	`recipient_phone` varchar(32),
	`message` text,
	`is_redeemed` boolean DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gift_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`menu_item_id` bigint unsigned NOT NULL,
	`is_available` boolean NOT NULL DEFAULT true,
	`sold_out_at` timestamp,
	`restocked_at` timestamp,
	`staff_note` text,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`name` varchar(128) NOT NULL,
	`address` varchar(255) NOT NULL,
	`phone` varchar(32),
	`is_default` boolean DEFAULT false,
	`hours_weekday` varchar(64),
	`hours_saturday` varchar(64),
	`hours_sunday` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_accounts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`phone` varchar(32) NOT NULL,
	`name` varchar(255),
	`points_balance` int NOT NULL DEFAULT 0,
	`total_lifetime_points` int NOT NULL DEFAULT 0,
	`coffees_redeemed` int NOT NULL DEFAULT 0,
	`pastries_redeemed` int NOT NULL DEFAULT 0,
	`bread_redeemed` int NOT NULL DEFAULT 0,
	`referral_credit` decimal(10,2) NOT NULL DEFAULT '0',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loyalty_transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`account_id` bigint unsigned NOT NULL,
	`type` enum('earn','redeem') NOT NULL,
	`points` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`order_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyalty_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `menu_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`slug` varchar(64) NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`category` enum('coffee','pastries','bread') NOT NULL,
	`dietary` text,
	`image` varchar(255),
	`is_daily_special` boolean DEFAULT false,
	`is_limited` boolean DEFAULT false,
	`origin_region` varchar(255),
	`origin_farm` varchar(255),
	`origin_altitude` varchar(64),
	`origin_process` varchar(128),
	`origin_tasting_notes` text,
	`origin_story` text,
	`square_catalog_id` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `menu_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`menu_item_id` bigint unsigned NOT NULL,
	`item_name` varchar(128) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(10,2) NOT NULL,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`order_number` varchar(32) NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`customer_phone` varchar(32) NOT NULL,
	`status` enum('pending','confirmed','ready','completed','cancelled') NOT NULL DEFAULT 'pending',
	`pickup_time` varchar(32) NOT NULL,
	`order_note` text,
	`staff_note` text,
	`payment_method` enum('online','pickup') NOT NULL DEFAULT 'pickup',
	`total_amount` decimal(10,2) NOT NULL,
	`location_id` bigint unsigned,
	`square_order_id` varchar(50),
	`customer_email` varchar(320),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_admins` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`password_hash` varchar(255) NOT NULL,
	`role` enum('superadmin','support') DEFAULT 'support',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `platform_admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`phone` varchar(32),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_codes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`code` varchar(16) NOT NULL,
	`referrer_phone` varchar(32) NOT NULL,
	`referrer_name` varchar(255),
	`credit_earned` decimal(10,2) NOT NULL DEFAULT '0',
	`uses` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `referral_codes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`customer_name` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff_accounts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(64) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','manager','staff') NOT NULL DEFAULT 'staff',
	`is_active` boolean DEFAULT true,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `staff_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_passes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`phone` varchar(32) NOT NULL,
	`name` varchar(128) NOT NULL,
	`total_credits` int NOT NULL,
	`remaining_credits` int NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`expires_at` timestamp,
	`is_active` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscription_passes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venue_owners` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`venue_id` bigint unsigned NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(255),
	`password_hash` varchar(255),
	`role` enum('owner','manager') DEFAULT 'owner',
	`is_active` boolean DEFAULT true,
	`last_login_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venue_owners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `venues` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`slug` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`subdomain` varchar(50),
	`custom_domain` varchar(100),
	`logo_url` varchar(500),
	`primary_color` varchar(7) DEFAULT '#181818',
	`accent_color` varchar(7) DEFAULT '#5E8B8B',
	`description` text,
	`address` varchar(255),
	`phone` varchar(32),
	`hours_weekday` varchar(64),
	`hours_saturday` varchar(64),
	`hours_sunday` varchar(64),
	`square_merchant_id` varchar(50),
	`square_location_id` varchar(50),
	`square_access_token` text,
	`square_refresh_token` text,
	`square_token_expires_at` timestamp,
	`square_enabled` boolean DEFAULT false,
	`stripe_customer_id` varchar(100),
	`stripe_subscription_id` varchar(100),
	`subscription_tier` enum('starter','pro','enterprise') DEFAULT 'starter',
	`subscription_status` enum('trial','active','past_due','cancelled') DEFAULT 'trial',
	`trial_ends_at` timestamp,
	`settings_json` json,
	`is_active` boolean DEFAULT true,
	`is_public` boolean DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `venues_id` PRIMARY KEY(`id`),
	CONSTRAINT `venues_slug_unique` UNIQUE(`slug`),
	CONSTRAINT `venues_subdomain_unique` UNIQUE(`subdomain`)
);
--> statement-breakpoint
ALTER TABLE `bundles` ADD CONSTRAINT `bundles_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `catering_requests` ADD CONSTRAINT `catering_requests_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `corporate_accounts` ADD CONSTRAINT `corporate_accounts_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `customer_preferences` ADD CONSTRAINT `customer_preferences_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gift_cards` ADD CONSTRAINT `gift_cards_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_menu_item_id_menu_items_id_fk` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `locations` ADD CONSTRAINT `locations_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_accounts` ADD CONSTRAINT `loyalty_accounts_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_account_id_loyalty_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `loyalty_accounts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_menu_item_id_menu_items_id_fk` FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `referral_codes` ADD CONSTRAINT `referral_codes_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_accounts` ADD CONSTRAINT `staff_accounts_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_passes` ADD CONSTRAINT `subscription_passes_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `venue_owners` ADD CONSTRAINT `venue_owners_venue_id_venues_id_fk` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE no action ON UPDATE no action;