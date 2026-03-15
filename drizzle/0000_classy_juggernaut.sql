CREATE TABLE `profiles` (
	`clerk_user_id` text PRIMARY KEY NOT NULL,
	`email` text,
	`full_name` text,
	`phone` text,
	`daily_generates` integer DEFAULT 0 NOT NULL,
	`last_reset_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`clerk_user_id` text NOT NULL,
	`child_name` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`theme` text NOT NULL,
	`custom_theme` text,
	`age` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`failure_reason` text,
	`parts` text DEFAULT '[]' NOT NULL,
	`cover_image_key` text,
	`is_paid` integer DEFAULT false NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	`public_slug` text,
	`views_count` integer DEFAULT 0 NOT NULL,
	`preview_excerpt` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`paid_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stories_public_slug_unique` ON `stories` (`public_slug`);--> statement-breakpoint
CREATE TABLE `story_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`clerk_user_id` text NOT NULL,
	`provider` text DEFAULT 'mayar' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_mobile` text NOT NULL,
	`mayar_payment_id` text,
	`mayar_transaction_id` text,
	`payment_link` text,
	`raw_payload` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`paid_at` integer
);
