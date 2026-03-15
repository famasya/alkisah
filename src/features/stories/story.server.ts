import { env } from "cloudflare:workers";
import { redirect } from "@tanstack/react-router";
import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { nanoid } from "nanoid";
import { and, desc, eq, getDb, schema, sql } from "~/db/index.server";
import type { StoryPartRecord } from "~/db/schema";
import { createStorySlug } from "~/lib/slug";
import { now, startOfUtcDay, toIsoDate } from "~/lib/time";
import { createSignedMediaUrl } from "../media/asset-token.server";
import { uploadBinaryObject } from "../media/storage.server";
import { createMayarPaymentLink, fetchMayarPaymentDetail } from "../providers/mayar.server";
import type {
	CreateStoryInput,
	LibraryQueryInput,
	PaymentRequestInput,
	PrivateLibraryQueryInput,
	StoryPublicInput,
} from "./story.schemas";
import type {
	StoryDetail,
	StoryLibraryCard,
	StoryLibraryResult,
	StoryPrivateLibraryCard,
	StoryPrivateLibraryResult,
} from "./story.types";

const DAILY_FREE_LIMIT = 3;
const PAGE_SIZE = 9;
const STORY_PRICE_IDR = 7000;
const appUrl = env.APP_URL || "http://localhost:3000";

function normalizeOptionalString(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function trimPreview(content: string) {
	return `${content.split(/\s+/).slice(0, 40).join(" ")}...`;
}

function decodeDataUrl(dataUrl: string) {
	const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
	if (!match) {
		throw new Error("Invalid image data URL");
	}

	return {
		contentType: match[1],
		buffer: Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0)),
	};
}

async function resolveGeneratedImage(source: string) {
	if (source.startsWith("data:")) {
		return decodeDataUrl(source);
	}

	const response = await fetch(source);
	if (!response.ok) {
		throw new Error(`Failed to download generated illustration (${response.status})`);
	}

	return {
		contentType: response.headers.get("content-type") ?? "image/png",
		buffer: new Uint8Array(await response.arrayBuffer()),
	};
}

function buildStoryContent(parts: Array<{ narrations: string[] }>) {
	return parts
		.flatMap((part) => part.narrations)
		.filter(Boolean)
		.join(" ");
}

function normalizePart(part: StoryPartRecord) {
	return {
		...part,
		regenerationAttempts: part.regenerationAttempts ?? 0,
	};
}

function preparePremiumParts(parts: StoryPartRecord[]): StoryPartRecord[] {
	return parts.map((part) => ({
		...normalizePart(part),
		voiceStatus: part.voiceKey ? ("generated" as const) : ("queued" as const),
		voiceFailureReason: undefined,
	}));
}

async function recordPendingMayarPayment(input: {
	storyId: string;
	userId: string;
	paymentId: string;
	transactionId?: string;
	paymentLink: string;
	customerName: string;
	customerEmail: string;
	customerMobile: string;
	rawPayload: Record<string, unknown>;
}) {
	const current = now();
	await getDb()
		.insert(schema.storyPayments)
		.values({
			id: nanoid(16),
			storyId: input.storyId,
			clerkUserId: input.userId,
			provider: "mayar",
			status: "pending",
			amount: STORY_PRICE_IDR,
			currency: "IDR",
			customerName: input.customerName,
			customerEmail: input.customerEmail,
			customerMobile: input.customerMobile,
			mayarPaymentId: input.paymentId,
			mayarTransactionId: input.transactionId,
			paymentLink: input.paymentLink,
			rawPayload: input.rawPayload,
			createdAt: current,
			updatedAt: current,
		});

	return current;
}

async function findLatestPendingPayment(storyId: string) {
	return getDb().query.storyPayments.findFirst({
		where: and(
			eq(schema.storyPayments.storyId, storyId),
			eq(schema.storyPayments.status, "pending"),
		),
		orderBy: [desc(schema.storyPayments.createdAt)],
	});
}

async function requireUserId() {
	const { userId } = await auth();
	if (!userId) {
		throw redirect({ to: "/sign-in" });
	}

	return userId;
}

async function ensureProfile(
	userId: string,
	profileData?: Partial<{ email: string; fullName: string; phone: string }>,
) {
	const db = getDb();
	const current = now();
	const dayStart = startOfUtcDay(current);
	const existing = await db.query.profiles.findFirst({
		where: eq(schema.profiles.clerkUserId, userId),
	});

	if (!existing) {
		await db.insert(schema.profiles).values({
			clerkUserId: userId,
			email: profileData?.email,
			fullName: profileData?.fullName,
			phone: profileData?.phone,
			dailyGenerates: 0,
			lastResetAt: dayStart,
			createdAt: current,
			updatedAt: current,
		});

		return {
			clerkUserId: userId,
			email: profileData?.email ?? null,
			fullName: profileData?.fullName ?? null,
			phone: profileData?.phone ?? null,
			dailyGenerates: 0,
			lastResetAt: dayStart,
			createdAt: current,
			updatedAt: current,
		};
	}

	if (existing.lastResetAt.getTime() !== dayStart.getTime()) {
		await db
			.update(schema.profiles)
			.set({
				dailyGenerates: 0,
				lastResetAt: dayStart,
				email: profileData?.email ?? existing.email,
				fullName: profileData?.fullName ?? existing.fullName,
				phone: profileData?.phone ?? existing.phone,
				updatedAt: current,
			})
			.where(eq(schema.profiles.clerkUserId, userId));

		return {
			...existing,
			dailyGenerates: 0,
			lastResetAt: dayStart,
			email: profileData?.email ?? existing.email,
			fullName: profileData?.fullName ?? existing.fullName,
			phone: profileData?.phone ?? existing.phone,
			updatedAt: current,
		};
	}

	if (profileData?.email || profileData?.fullName || profileData?.phone) {
		await db
			.update(schema.profiles)
			.set({
				email: profileData?.email ?? existing.email,
				fullName: profileData?.fullName ?? existing.fullName,
				phone: profileData?.phone ?? existing.phone,
				updatedAt: current,
			})
			.where(eq(schema.profiles.clerkUserId, userId));

		return {
			...existing,
			email: profileData?.email ?? existing.email,
			fullName: profileData?.fullName ?? existing.fullName,
			phone: profileData?.phone ?? existing.phone,
			updatedAt: current,
		};
	}

	return existing;
}

async function getClerkProfile(userId: string) {
	try {
		const user = await clerkClient().users.getUser(userId);
		const primaryEmail =
			user.emailAddresses.find((value) => value.id === user.primaryEmailAddressId)?.emailAddress ??
			user.emailAddresses[0]?.emailAddress;
		const primaryPhone =
			user.phoneNumbers.find((value) => value.id === user.primaryPhoneNumberId)?.phoneNumber ??
			user.phoneNumbers[0]?.phoneNumber;
		const fullName =
			[user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
			user.username ||
			primaryEmail?.split("@")[0];

		return {
			email: normalizeOptionalString(primaryEmail),
			fullName: normalizeOptionalString(fullName),
			phone: normalizeOptionalString(primaryPhone),
		};
	} catch {
		return {};
	}
}

async function getResolvedProfile(userId: string) {
	const profile = await ensureProfile(userId);
	const clerkProfile = await getClerkProfile(userId);
	const nextProfile = {
		email: clerkProfile.email ?? profile.email ?? undefined,
		fullName: clerkProfile.fullName ?? profile.fullName ?? undefined,
		phone: profile.phone ?? clerkProfile.phone ?? undefined,
	};

	if (
		nextProfile.email !== profile.email ||
		nextProfile.fullName !== profile.fullName ||
		nextProfile.phone !== profile.phone
	) {
		return await ensureProfile(userId, nextProfile);
	}

	return profile;
}

async function resolveBillingContact(userId: string, input?: { customerMobile?: string }) {
	const profile = await getResolvedProfile(userId);
	const customerName = normalizeOptionalString(profile.fullName);
	const customerEmail = normalizeOptionalString(profile.email);
	const customerMobile =
		normalizeOptionalString(input?.customerMobile) ?? normalizeOptionalString(profile.phone);

	if (!customerName) {
		throw new Error("Nama akun Clerk belum tersedia. Lengkapi nama akun sebelum checkout.");
	}

	if (!customerEmail) {
		throw new Error("Email akun Clerk belum tersedia. Lengkapi email akun sebelum checkout.");
	}

	if (!customerMobile || customerMobile.length < 8 || customerMobile.length > 20) {
		throw new Error("Nomor HP wajib diisi dengan format yang valid untuk checkout Mayar.");
	}

	return {
		customerName,
		customerEmail,
		customerMobile,
	};
}

async function serializeStory(row: typeof schema.stories.$inferSelect): Promise<StoryDetail> {
	const pendingPayment = row.isPaid ? null : await findLatestPendingPayment(row.id);
	const coverImageUrl = row.coverImageKey
		? await createSignedMediaUrl({
				storyId: row.id,
				index: 0,
				kind: "image",
				key: row.coverImageKey,
			})
		: undefined;
	const parts = await Promise.all(
		row.parts.map(async (part, index) => ({
			order: part.order,
			narrations: part.narrations,
			regenerationAttempts: part.regenerationAttempts ?? 0,
			illustrationStatus:
				part.illustrationStatus ?? (part.illustrationKey ? "generated" : "queued"),
			illustrationFailureReason: part.illustrationFailureReason,
			illustrationUrl: part.illustrationKey
				? await createSignedMediaUrl({
						storyId: row.id,
						index,
						kind: "image",
						key: part.illustrationKey,
					})
				: undefined,
			voiceStatus: part.voiceStatus ?? (part.voiceKey ? "generated" : "queued"),
			voiceFailureReason: part.voiceFailureReason,
			voiceUrl: part.voiceKey
				? await createSignedMediaUrl({
						storyId: row.id,
						index,
						kind: "audio",
						key: part.voiceKey,
					})
				: undefined,
		})),
	);

	return {
		id: row.id,
		title: row.title,
		content: row.content,
		childName: row.childName,
		theme: row.theme,
		customTheme: row.customTheme,
		age: row.age,
		status: row.status as StoryDetail["status"],
		isPaid: row.isPaid,
		isPublic: row.isPublic,
		publicSlug: row.publicSlug,
		viewsCount: row.viewsCount,
		createdAt: toIsoDate(row.createdAt),
		paidAt: row.paidAt ? toIsoDate(row.paidAt) : null,
		previewExcerpt: row.previewExcerpt,
		coverImageUrl,
		pendingPaymentLink: pendingPayment?.paymentLink ?? null,
		parts,
		canListenToPaidAudio: row.isPaid,
		failureReason: row.failureReason,
	};
}

async function serializeCard(row: typeof schema.stories.$inferSelect): Promise<StoryLibraryCard> {
	return {
		id: row.id,
		title: row.title,
		theme: row.theme,
		age: row.age,
		coverImageUrl: row.coverImageKey
			? await createSignedMediaUrl({
					storyId: row.id,
					index: 0,
					kind: "image",
					key: row.coverImageKey,
				})
			: undefined,
		previewExcerpt: row.previewExcerpt ?? undefined,
		viewsCount: row.viewsCount,
		publicSlug: row.publicSlug ?? row.id,
		createdAt: toIsoDate(row.createdAt),
	};
}

async function serializePrivateCard(
	row: typeof schema.stories.$inferSelect,
): Promise<StoryPrivateLibraryCard> {
	return {
		id: row.id,
		title: row.title,
		theme: row.theme,
		age: row.age,
		coverImageUrl: row.coverImageKey
			? await createSignedMediaUrl({
					storyId: row.id,
					index: 0,
					kind: "image",
					key: row.coverImageKey,
				})
			: undefined,
		previewExcerpt: row.previewExcerpt ?? undefined,
		createdAt: toIsoDate(row.createdAt),
		paidAt: row.paidAt ? toIsoDate(row.paidAt) : null,
		isPublic: row.isPublic,
		publicSlug: row.publicSlug,
	};
}

async function getOwnedStoryRow(storyId: string, userId: string) {
	return getDb().query.stories.findFirst({
		where: and(eq(schema.stories.id, storyId), eq(schema.stories.clerkUserId, userId)),
	});
}

async function getPublicStoryRow(slug: string) {
	return getDb().query.stories.findFirst({
		where: and(
			eq(schema.stories.publicSlug, slug),
			eq(schema.stories.isPublic, true),
			eq(schema.stories.isPaid, true),
		),
	});
}

export async function getViewer() {
	const userId = await requireUserId();
	const profile = await getResolvedProfile(userId);
	return {
		userId,
		profile,
		dailyFreeRemaining: Math.max(DAILY_FREE_LIMIT - profile.dailyGenerates, 0),
	};
}

function buildGenerationInputFromStory(
	story: typeof schema.stories.$inferSelect,
): CreateStoryInput {
	return {
		childName: story.childName,
		age: story.age,
		theme: story.theme,
		customTheme: story.customTheme ?? undefined,
		mode: story.isPaid ? "paid" : "free",
		customerMobile: undefined,
	};
}

async function generateAndPersistStoryDraft(input: {
	story: typeof schema.stories.$inferSelect;
	isPaid: boolean;
}) {
	const db = getDb();
	const { generateStoryDraft } = await import("../providers/openrouter.server");
	const generated = await generateStoryDraft(buildGenerationInputFromStory(input.story));
	const parts: StoryPartRecord[] = generated.parts.map((part, index) => ({
		order: generated.parts[index]?.order ?? index + 1,
		narrations: generated.parts[index]?.narrations ?? [],
		characterGuide: generated.characterGuide,
		illustrationPrompt: generated.parts[index]?.illustrationPrompt ?? "",
		regenerationAttempts: 0,
		illustrationStatus: "queued",
		voiceStatus: "queued",
	}));
	const fullContent = buildStoryContent(parts);
	const nextParts = input.isPaid ? preparePremiumParts(parts) : parts;

	await db
		.update(schema.stories)
		.set({
			title: generated.title,
			content: fullContent,
			parts: nextParts,
			coverImageKey: null,
			previewExcerpt: trimPreview(fullContent),
			status: input.isPaid ? "paid" : "generated",
			failureReason: null,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, input.story.id));
}

export async function createStory(input: CreateStoryInput) {
	const userId = await requireUserId();
	const profile = await getResolvedProfile(userId);
	const isPaidCreate = input.mode === "paid";

	if (!isPaidCreate && profile.dailyGenerates >= DAILY_FREE_LIMIT) {
		throw new Error(
			"Kuota gratis hari ini sudah habis. Cerita berikutnya harus dibuat lewat pembayaran Rp7.000 di depan.",
		);
	}

	const db = getDb();
	const createdAt = now();
	const storyId = nanoid(16);
	const billingContact = isPaidCreate
		? await resolveBillingContact(userId, {
				customerMobile: input.customerMobile,
			})
		: undefined;

	if (isPaidCreate) {
		await ensureProfile(userId, {
			email: billingContact?.customerEmail,
			fullName: billingContact?.customerName,
			phone: billingContact?.customerMobile,
		});
	} else {
		await db
			.update(schema.profiles)
			.set({
				dailyGenerates: profile.dailyGenerates + 1,
				updatedAt: createdAt,
			})
			.where(eq(schema.profiles.clerkUserId, userId));
	}

	const initialTitle = isPaidCreate ? "Menunggu pembayaran..." : "Sedang menulis cerita...";
	const initialStatus = isPaidCreate ? "payment_pending" : "generating";
	await db.insert(schema.stories).values({
		id: storyId,
		clerkUserId: userId,
		childName: input.childName,
		title: initialTitle,
		content: "",
		theme: input.theme,
		customTheme: input.customTheme,
		age: input.age,
		status: initialStatus,
		parts: [],
		previewExcerpt: "",
		isPaid: false,
		isPublic: false,
		viewsCount: 0,
		createdAt,
		updatedAt: createdAt,
	});

	if (isPaidCreate) {
		try {
			const payment = await createMayarPaymentLink({
				name: billingContact!.customerName,
				email: billingContact!.customerEmail,
				mobile: billingContact!.customerMobile,
				amount: STORY_PRICE_IDR,
				description: `Buat Cerita Premium: ${input.childName}`,
				redirectUrl: `${appUrl}/stories/${storyId}?payment=success`,
			});
			await recordPendingMayarPayment({
				storyId,
				userId,
				paymentId: payment.id,
				transactionId: payment.transactionId,
				paymentLink: payment.paymentLink,
				customerName: billingContact!.customerName,
				customerEmail: billingContact!.customerEmail,
				customerMobile: billingContact!.customerMobile,
				rawPayload: { mode: "paid_create" },
			});

			return {
				storyId,
				paymentLink: payment.paymentLink,
			};
		} catch (error) {
			await db.delete(schema.stories).where(eq(schema.stories.id, storyId));
			throw error;
		}
	}

	try {
		const story = await getOwnedStoryRow(storyId, userId);
		if (!story) {
			throw new Error("Cerita tidak ditemukan.");
		}
		await generateAndPersistStoryDraft({
			story,
			isPaid: false,
		});
	} catch (error) {
		await db
			.update(schema.stories)
			.set({
				status: "failed",
				failureReason: error instanceof Error ? error.message : "Unknown generation error",
				updatedAt: now(),
			})
			.where(eq(schema.stories.id, storyId));

		throw error;
	}

	return { storyId };
}

export async function getOwnedStory(storyId: string) {
	const userId = await requireUserId();
	const story = await getOwnedStoryRow(storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	return await serializeStory(story);
}

export async function getPublicStory(slug: string) {
	const db = getDb();
	const story = await getPublicStoryRow(slug);

	if (!story) {
		throw new Error("Cerita publik tidak ditemukan.");
	}

	await db
		.update(schema.stories)
		.set({
			viewsCount: sql`${schema.stories.viewsCount} + 1`,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, story.id));

	const refreshed = await getPublicStoryRow(slug);
	if (!refreshed) {
		throw new Error("Cerita publik tidak ditemukan.");
	}

	return await serializeStory(refreshed);
}

export async function listPublicStories(query: LibraryQueryInput): Promise<StoryLibraryResult> {
	const db = getDb();
	const offset = (query.page - 1) * PAGE_SIZE;

	const [countRow] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.stories)
		.where(and(eq(schema.stories.isPublic, true), eq(schema.stories.isPaid, true)));

	const items = await db.query.stories.findMany({
		where: and(eq(schema.stories.isPublic, true), eq(schema.stories.isPaid, true)),
		orderBy:
			query.sort === "popular"
				? [desc(schema.stories.viewsCount), desc(schema.stories.createdAt)]
				: [desc(schema.stories.createdAt)],
		limit: PAGE_SIZE,
		offset,
	});

	const totalItems = Number(countRow?.count ?? 0);

	return {
		items: await Promise.all(items.map((item) => serializeCard(item))),
		page: query.page,
		pageSize: PAGE_SIZE,
		sort: query.sort,
		totalItems,
		hasNextPage: offset + items.length < totalItems,
	};
}

export async function listPrivateStories(
	query: PrivateLibraryQueryInput,
): Promise<StoryPrivateLibraryResult> {
	const userId = await requireUserId();
	const db = getDb();
	const offset = (query.page - 1) * PAGE_SIZE;

	const [countRow] = await db
		.select({ count: sql<number>`count(*)` })
		.from(schema.stories)
		.where(and(eq(schema.stories.clerkUserId, userId), eq(schema.stories.isPaid, true)));

	const items = await db.query.stories.findMany({
		where: and(eq(schema.stories.clerkUserId, userId), eq(schema.stories.isPaid, true)),
		orderBy: [desc(schema.stories.paidAt), desc(schema.stories.createdAt)],
		limit: PAGE_SIZE,
		offset,
	});

	const totalItems = Number(countRow?.count ?? 0);

	return {
		items: await Promise.all(items.map((item) => serializePrivateCard(item))),
		page: query.page,
		pageSize: PAGE_SIZE,
		totalItems,
		hasNextPage: offset + items.length < totalItems,
	};
}

function getNextQueuedIllustrationIndex(parts: StoryPartRecord[]) {
	return parts.findIndex(
		(part) =>
			!part.illustrationKey &&
			(part.illustrationStatus === "queued" || part.illustrationStatus === "generating"),
	);
}

async function processStoryIllustrationIndex(input: {
	story: typeof schema.stories.$inferSelect;
	userId: string;
	illustrationIndex: number;
}) {
	const db = getDb();
	const parts = [...input.story.parts];
	const currentPart = parts[input.illustrationIndex];

	if (!currentPart) {
		throw new Error("Bagian ilustrasi tidak ditemukan.");
	}

	parts[input.illustrationIndex] = {
		...normalizePart(currentPart),
		illustrationStatus: "generating",
		illustrationFailureReason: undefined,
	};
	await db
		.update(schema.stories)
		.set({
			parts,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, input.story.id));

	try {
		const { generateIllustration } = await import("../providers/openrouter.server");
		const imageSource = await generateIllustration(
			parts[input.illustrationIndex]?.illustrationPrompt ?? "",
			parts[input.illustrationIndex]?.characterGuide,
		);
		const { buffer, contentType } = await resolveGeneratedImage(imageSource);
		const extension = contentType.includes("png")
			? "png"
			: contentType.includes("webp")
				? "webp"
				: "jpg";
		const key = `stories/${input.story.id}/images/${input.illustrationIndex}.${extension}`;
		await uploadBinaryObject(key, buffer, contentType);
		parts[input.illustrationIndex] = {
			...parts[input.illustrationIndex]!,
			illustrationKey: key,
			illustrationStatus: "generated",
			illustrationFailureReason: undefined,
		};
	} catch (error) {
		parts[input.illustrationIndex] = {
			...parts[input.illustrationIndex]!,
			illustrationStatus: "failed",
			illustrationFailureReason:
				error instanceof Error ? error.message : "Unknown illustration error",
		};
	}

	await db
		.update(schema.stories)
		.set({
			parts,
			coverImageKey:
				input.illustrationIndex === 0
					? (parts[input.illustrationIndex]?.illustrationKey ?? null)
					: input.story.coverImageKey,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, input.story.id));

	const refreshed = await getOwnedStoryRow(input.story.id, input.userId);
	if (!refreshed) {
		throw new Error("Cerita tidak ditemukan.");
	}

	return await serializeStory(refreshed);
}

export async function processStoryIllustrations(storyId: string) {
	const userId = await requireUserId();
	const story = await getOwnedStoryRow(storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	const illustrationIndex = getNextQueuedIllustrationIndex(story.parts);
	if (illustrationIndex < 0) {
		return await serializeStory(story);
	}

	return await processStoryIllustrationIndex({
		story,
		userId,
		illustrationIndex,
	});
}

export async function retryStoryPartIllustration(storyId: string, index: number) {
	const userId = await requireUserId();
	const db = getDb();
	const story = await getOwnedStoryRow(storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	const part = story.parts[index];
	if (!part) {
		throw new Error("Bagian cerita tidak ditemukan.");
	}

	if (part.illustrationStatus !== "failed") {
		throw new Error("Ilustrasi bagian ini belum gagal, jadi belum perlu dicoba lagi.");
	}

	const parts = [...story.parts];
	parts[index] = {
		...normalizePart(part),
		illustrationStatus: "queued",
		illustrationFailureReason: undefined,
		illustrationKey: undefined,
	};
	await db
		.update(schema.stories)
		.set({
			parts,
			coverImageKey: index === 0 ? null : story.coverImageKey,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, story.id));

	const refreshed = await getOwnedStoryRow(story.id, userId);
	if (!refreshed) {
		throw new Error("Cerita tidak ditemukan.");
	}

	return await processStoryIllustrationIndex({
		story: refreshed,
		userId,
		illustrationIndex: index,
	});
}

export async function createPaymentLinkForStory(input: PaymentRequestInput) {
	const userId = await requireUserId();
	const db = getDb();
	const story = await getOwnedStoryRow(input.storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	if (story.isPaid) {
		return { paymentLink: `${appUrl}/stories/${story.id}` };
	}

	if (story.status !== "generated" && story.status !== "payment_pending") {
		throw new Error("Cerita belum siap untuk dibayar.");
	}

	const pendingPayment = await findLatestPendingPayment(story.id);
	if (pendingPayment?.paymentLink) {
		return { paymentLink: pendingPayment.paymentLink };
	}

	const billingContact = await resolveBillingContact(userId, {
		customerMobile: input.customerMobile,
	});
	await ensureProfile(userId, {
		email: billingContact.customerEmail,
		fullName: billingContact.customerName,
		phone: billingContact.customerMobile,
	});

	const payment = await createMayarPaymentLink({
		name: billingContact.customerName,
		email: billingContact.customerEmail,
		mobile: billingContact.customerMobile,
		amount: STORY_PRICE_IDR,
		description: `Unlock Cerita Anak: ${story.title}`,
		redirectUrl: `${appUrl}/stories/${story.id}?payment=success`,
	});
	await recordPendingMayarPayment({
		storyId: story.id,
		userId,
		paymentId: payment.id,
		transactionId: payment.transactionId,
		paymentLink: payment.paymentLink,
		customerName: billingContact.customerName,
		customerEmail: billingContact.customerEmail,
		customerMobile: billingContact.customerMobile,
		rawPayload: { mode: "unlock_existing_story" },
	});
	const current = now();
	await db
		.update(schema.stories)
		.set({
			status: "payment_pending",
			updatedAt: current,
		})
		.where(eq(schema.stories.id, story.id));

	return { paymentLink: payment.paymentLink };
}

function extractMayarEvent(payload: Record<string, unknown>) {
	const nestedEvent = payload.event;
	if (typeof nestedEvent === "object" && nestedEvent && "received" in nestedEvent) {
		const received = nestedEvent.received;
		return typeof received === "string" ? received : undefined;
	}

	const flatEvent = payload["event.received"];
	return typeof flatEvent === "string" ? flatEvent : undefined;
}

function extractMayarPaymentId(payload: Record<string, unknown>) {
	const data = payload.data;
	if (typeof data === "object" && data) {
		if ("id" in data && typeof data.id === "string") {
			return data.id;
		}

		if ("requestId" in data && typeof data.requestId === "string") {
			return data.requestId;
		}
	}

	return undefined;
}

async function markPaymentPaid(
	payment: typeof schema.storyPayments.$inferSelect,
	rawPayload: Record<string, unknown>,
) {
	if (!payment.mayarPaymentId) {
		throw new Error("Missing Mayar payment id.");
	}

	const detail = await fetchMayarPaymentDetail(payment.mayarPaymentId);

	if (detail.status?.toLowerCase() !== "paid") {
		return { detail, paymentAlreadySettled: false };
	}

	if (detail.amount !== STORY_PRICE_IDR) {
		throw new Error(
			`Mayar payment amount mismatch: expected ${STORY_PRICE_IDR}, got ${detail.amount}`,
		);
	}

	if (payment.status !== "paid") {
		const paidAt = now();
		await getDb()
			.update(schema.storyPayments)
			.set({
				status: "paid",
				mayarTransactionId: detail.transactionId ?? payment.mayarTransactionId,
				rawPayload,
				paidAt,
				updatedAt: paidAt,
			})
			.where(eq(schema.storyPayments.id, payment.id));
	}

	return {
		detail,
		paymentAlreadySettled: payment.status === "paid",
	};
}

async function settlePaidStory(storyId: string) {
	const db = getDb();
	const story = await db.query.stories.findFirst({
		where: eq(schema.stories.id, storyId),
	});
	if (!story) {
		return;
	}

	if (story.isPaid || story.status === "generating") {
		return;
	}

	const paidAt = now();
	if (story.parts.length > 0) {
		await db
			.update(schema.stories)
			.set({
				parts: preparePremiumParts(story.parts),
				isPaid: true,
				status: "paid",
				paidAt,
				updatedAt: paidAt,
			})
			.where(eq(schema.stories.id, story.id));
		return;
	}

	await db
		.update(schema.stories)
		.set({
			isPaid: true,
			status: "generating",
			paidAt,
			title: "Sedang menulis cerita premium...",
			failureReason: null,
			updatedAt: paidAt,
		})
		.where(eq(schema.stories.id, story.id));

	const generatingStory = await db.query.stories.findFirst({
		where: eq(schema.stories.id, story.id),
	});
	if (!generatingStory) {
		return;
	}

	try {
		await generateAndPersistStoryDraft({
			story: {
				...generatingStory,
				isPaid: true,
			},
			isPaid: true,
		});
	} catch (error) {
		await db
			.update(schema.stories)
			.set({
				status: "failed",
				failureReason: error instanceof Error ? error.message : "Unknown generation error",
				updatedAt: now(),
			})
			.where(eq(schema.stories.id, story.id));
	}
}

export async function confirmStoryPaymentFromRedirect(storyId: string) {
	const userId = await requireUserId();
	const story = await getOwnedStoryRow(storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	if (story.isPaid) {
		return await serializeStory(story);
	}

	const pendingPayment = await findLatestPendingPayment(story.id);
	if (!pendingPayment) {
		throw new Error("Pembayaran pending untuk cerita ini tidak ditemukan.");
	}

	const { detail } = await markPaymentPaid(pendingPayment, {
		mode: "redirect_confirmation",
		storyId: story.id,
	});

	if (detail.status?.toLowerCase() !== "paid") {
		throw new Error("Pembayaran Mayar belum terkonfirmasi.");
	}

	await settlePaidStory(story.id);

	const refreshed = await getOwnedStoryRow(story.id, userId);
	if (!refreshed) {
		throw new Error("Cerita tidak ditemukan.");
	}

	return await serializeStory(refreshed);
}

export async function handleMayarWebhook(payload: Record<string, unknown>) {
	const eventName = extractMayarEvent(payload);
	if (eventName !== "payment.received") {
		return { ok: true, ignored: true };
	}

	const paymentId = extractMayarPaymentId(payload);
	if (!paymentId) {
		return { ok: true, ignored: true };
	}

	const payment = await getDb().query.storyPayments.findFirst({
		where: eq(schema.storyPayments.mayarPaymentId, paymentId),
	});
	if (!payment) {
		return { ok: true, ignored: true };
	}

	const { detail } = await markPaymentPaid(payment, payload);
	if (detail.status?.toLowerCase() !== "paid") {
		return { ok: true, ignored: true };
	}

	await settlePaidStory(payment.storyId);

	return { ok: true };
}

async function findUniqueSlug(title: string, storyId: string) {
	const db = getDb();
	let candidate = createStorySlug(title, storyId);
	let suffix = 1;

	while (await db.query.stories.findFirst({ where: eq(schema.stories.publicSlug, candidate) })) {
		candidate = `${createStorySlug(title, storyId)}-${suffix}`;
		suffix += 1;
	}

	return candidate;
}

export async function setStoryPublicState(input: StoryPublicInput) {
	const userId = await requireUserId();
	const db = getDb();
	const story = await getOwnedStoryRow(input.storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	if (input.isPublic && !story.isPaid) {
		throw new Error("Cerita harus sudah dibayar sebelum dipublikasikan.");
	}

	const publicSlug = input.isPublic
		? (story.publicSlug ?? (await findUniqueSlug(story.title, story.id)))
		: story.publicSlug;

	await db
		.update(schema.stories)
		.set({
			isPublic: input.isPublic,
			publicSlug,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, story.id));

	return {
		isPublic: input.isPublic,
		publicSlug,
		publicUrl: publicSlug ? `${appUrl}/s/${publicSlug}` : undefined,
	};
}

export async function generateStoryPartAudio(storyId: string, index: number) {
	const userId = await requireUserId();
	const db = getDb();
	const story = await getOwnedStoryRow(storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	if (!story.isPaid) {
		throw new Error("Audio premium baru bisa dibuat setelah unlock.");
	}

	const part = story.parts[index];
	if (!part) {
		throw new Error("Bagian cerita tidak ditemukan.");
	}

	if (part.voiceKey && part.voiceStatus === "generated") {
		return await serializeStory(story);
	}

	const parts = [...story.parts];
	parts[index] = {
		...part,
		voiceStatus: "generating",
		voiceFailureReason: undefined,
	};
	await db
		.update(schema.stories)
		.set({
			parts,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, story.id));

	try {
		const { generateStoryAudio } = await import("../providers/elevenlabs.server");
		const audioBuffer = await generateStoryAudio(part.narrations.join(" "));
		const audioKey = `stories/${story.id}/audio/${index}.mp3`;
		await uploadBinaryObject(audioKey, audioBuffer, "audio/mpeg");
		parts[index] = {
			...parts[index]!,
			voiceKey: audioKey,
			voiceStatus: "generated",
			voiceFailureReason: undefined,
		};
	} catch (error) {
		parts[index] = {
			...parts[index]!,
			voiceStatus: "failed",
			voiceFailureReason: error instanceof Error ? error.message : "Unknown audio error",
		};
	}

	await db
		.update(schema.stories)
		.set({
			parts,
			updatedAt: now(),
		})
		.where(eq(schema.stories.id, story.id));

	const refreshed = await getOwnedStoryRow(story.id, userId);
	if (!refreshed) {
		throw new Error("Cerita tidak ditemukan.");
	}

	return await serializeStory(refreshed);
}

export async function regenerateStoryPart(storyId: string, index: number, prompt: string) {
	const userId = await requireUserId();
	const db = getDb();
	const story = await getOwnedStoryRow(storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	if (story.status !== "generated" && story.status !== "paid") {
		throw new Error("Bagian cerita baru bisa diubah setelah cerita selesai dibuat.");
	}

	const part = story.parts[index];
	if (!part) {
		throw new Error("Bagian cerita tidak ditemukan.");
	}

	if (part.voiceStatus === "generated" || part.voiceKey) {
		throw new Error("Bagian yang sudah punya audio tidak bisa diregenerate lagi.");
	}

	if (part.voiceStatus === "generating") {
		throw new Error("Tunggu audio bagian ini selesai dibuat sebelum mengubah teksnya.");
	}

	const attempts = part.regenerationAttempts ?? 0;
	if (attempts >= 3) {
		throw new Error("Batas regenerate untuk bagian ini sudah habis.");
	}

	try {
		const { regenerateStorySection } = await import("../providers/openrouter.server");
		const regenerated = await regenerateStorySection({
			childName: story.childName,
			age: story.age,
			theme: story.theme,
			customTheme: story.customTheme,
			title: story.title,
			characterGuide: part.characterGuide,
			currentSectionOrder: part.order,
			currentNarrations: part.narrations,
			allSections: story.parts.map((section) => ({
				order: section.order,
				narrations: section.narrations,
			})),
			prompt,
		});

		const parts = [...story.parts];
		parts[index] = {
			...normalizePart(part),
			narrations: regenerated.narrations,
			illustrationPrompt: regenerated.illustrationPrompt,
			regenerationAttempts: attempts + 1,
			illustrationKey: undefined,
			illustrationStatus: "queued",
			illustrationFailureReason: undefined,
		};
		const fullContent = buildStoryContent(parts);

		await db
			.update(schema.stories)
			.set({
				content: fullContent,
				previewExcerpt: trimPreview(fullContent),
				parts,
				coverImageKey: index === 0 ? null : story.coverImageKey,
				updatedAt: now(),
			})
			.where(eq(schema.stories.id, story.id));
	} catch (error) {
		const parts = [...story.parts];
		parts[index] = {
			...normalizePart(part),
			regenerationAttempts: attempts + 1,
		};
		await db
			.update(schema.stories)
			.set({
				parts,
				updatedAt: now(),
			})
			.where(eq(schema.stories.id, story.id));

		throw error;
	}

	const refreshed = await getOwnedStoryRow(story.id, userId);
	if (!refreshed) {
		throw new Error("Cerita tidak ditemukan.");
	}

	return await serializeStory(refreshed);
}

async function assertStoryCanBeRead(storyId: string) {
	const story = await getDb().query.stories.findFirst({
		where: eq(schema.stories.id, storyId),
	});

	if (!story) {
		throw new Error("Story not found");
	}

	if (story.isPublic && story.isPaid) {
		return story;
	}

	const { userId } = await auth();
	if (!userId || story.clerkUserId !== userId) {
		throw new Error("You do not have access to this story asset");
	}

	return story;
}

export async function getStoryImageAsset(storyId: string, index: number) {
	const story = await assertStoryCanBeRead(storyId);
	const part = story.parts[index];

	if (!part?.illustrationKey) {
		throw new Error("Image not found");
	}

	return {
		story,
		key: part.illustrationKey,
	};
}

export async function getStoryAudioAsset(storyId: string, index: number) {
	const story = await assertStoryCanBeRead(storyId);
	const part = story.parts[index];

	if (!part?.voiceKey) {
		throw new Error("Audio not found");
	}

	return {
		story,
		key: part.voiceKey,
	};
}
