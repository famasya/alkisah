import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export type StoryPartRecord = {
	order: number;
	narrations: string[];
	illustrationPrompt: string;
	illustrationKey?: string;
	voiceKey?: string;
};

export const profiles = sqliteTable("profiles", {
	clerkUserId: text("clerk_user_id").primaryKey(),
	email: text("email"),
	fullName: text("full_name"),
	phone: text("phone"),
	dailyGenerates: integer("daily_generates").notNull().default(0),
	lastResetAt: integer("last_reset_at", { mode: "timestamp_ms" }).notNull(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const stories = sqliteTable("stories", {
	id: text("id").primaryKey(),
	clerkUserId: text("clerk_user_id").notNull(),
	childName: text("child_name").notNull(),
	title: text("title").notNull(),
	content: text("content").notNull(),
	theme: text("theme").notNull(),
	customTheme: text("custom_theme"),
	age: integer("age").notNull(),
	status: text("status").notNull().default("draft"),
	failureReason: text("failure_reason"),
	parts: text("parts", { mode: "json" }).$type<StoryPartRecord[]>().notNull().default([]),
	coverImageKey: text("cover_image_key"),
	isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
	isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
	publicSlug: text("public_slug").unique(),
	viewsCount: integer("views_count").notNull().default(0),
	previewExcerpt: text("preview_excerpt"),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
	paidAt: integer("paid_at", { mode: "timestamp_ms" }),
});

export const storyPayments = sqliteTable("story_payments", {
	id: text("id").primaryKey(),
	storyId: text("story_id").notNull(),
	clerkUserId: text("clerk_user_id").notNull(),
	provider: text("provider").notNull().default("mayar"),
	status: text("status").notNull().default("pending"),
	amount: integer("amount").notNull(),
	currency: text("currency").notNull().default("IDR"),
	customerName: text("customer_name").notNull(),
	customerEmail: text("customer_email").notNull(),
	customerMobile: text("customer_mobile").notNull(),
	mayarPaymentId: text("mayar_payment_id"),
	mayarTransactionId: text("mayar_transaction_id"),
	paymentLink: text("payment_link"),
	rawPayload: text("raw_payload", { mode: "json" }).$type<Record<string, unknown> | null>(),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
	paidAt: integer("paid_at", { mode: "timestamp_ms" }),
});

export type ProfileRow = typeof profiles.$inferSelect;
export type StoryRow = typeof stories.$inferSelect;
export type StoryPaymentRow = typeof storyPayments.$inferSelect;
