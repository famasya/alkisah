import { redirect } from "@tanstack/react-router";
import { auth } from "@clerk/tanstack-react-start/server";
import { nanoid } from "nanoid";
import { and, desc, eq, getDb, schema, sql } from "~/db/index.server";
import type { StoryPartRecord } from "~/db/schema";
import { getAppUrl } from "~/lib/app-env.server";
import { createStorySlug } from "~/lib/slug";
import { now, startOfUtcDay, toIsoDate } from "~/lib/time";
import { createSignedMediaUrl } from "../media/asset-token.server";
import { uploadBinaryObject } from "../media/storage.server";
import type {
	CreateStoryInput,
	LibraryQueryInput,
	PaymentRequestInput,
	StoryPublicInput,
} from "./story.schemas";
import type { StoryDetail, StoryLibraryCard, StoryLibraryResult } from "./story.types";

const DAILY_FREE_LIMIT = 3;
const PAGE_SIZE = 9;
const STORY_PRICE_IDR = 5000;

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
	}

	return existing;
}

async function serializeStory(row: typeof schema.stories.$inferSelect): Promise<StoryDetail> {
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
			illustrationUrl: part.illustrationKey
				? await createSignedMediaUrl({
						storyId: row.id,
						index,
						kind: "image",
						key: part.illustrationKey,
					})
				: undefined,
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
	const profile = await ensureProfile(userId);
	return {
		userId,
		profile,
		dailyFreeRemaining: Math.max(DAILY_FREE_LIMIT - profile.dailyGenerates, 0),
	};
}

export async function createStory(input: CreateStoryInput) {
	const userId = await requireUserId();
	const profile = await ensureProfile(userId);

	if (profile.dailyGenerates >= DAILY_FREE_LIMIT) {
		throw new Error(
			"Kuota gratis hari ini sudah habis. Buka cerita berikutnya dengan pembayaran Rp5.000.",
		);
	}

	const db = getDb();
	const createdAt = now();
	const storyId = nanoid(16);

	await db
		.update(schema.profiles)
		.set({
			dailyGenerates: profile.dailyGenerates + 1,
			updatedAt: createdAt,
		})
		.where(eq(schema.profiles.clerkUserId, userId));

	await db.insert(schema.stories).values({
		id: storyId,
		clerkUserId: userId,
		childName: input.childName,
		title: "Sedang menulis cerita...",
		content: "",
		theme: input.theme,
		customTheme: input.customTheme,
		age: input.age,
		status: "generating",
		parts: [],
		previewExcerpt: "",
		isPaid: false,
		isPublic: false,
		viewsCount: 0,
		createdAt,
		updatedAt: createdAt,
	});

	try {
		const { generateIllustration, generateStoryDraft } =
			await import("../providers/openrouter.server");
		const generated = await generateStoryDraft(input);
		const illustrationData = await Promise.all(
			generated.parts.map((part) => generateIllustration(part.illustrationPrompt)),
		);
		const parts: StoryPartRecord[] = [];

		for (const [index, imageSource] of illustrationData.entries()) {
			const { buffer, contentType } = await resolveGeneratedImage(imageSource);
			const extension = contentType.includes("png")
				? "png"
				: contentType.includes("webp")
					? "webp"
					: "jpg";
			const key = `stories/${storyId}/images/${index}.${extension}`;
			await uploadBinaryObject(key, buffer, contentType);
			parts.push({
				order: generated.parts[index]?.order ?? index + 1,
				narrations: generated.parts[index]?.narrations ?? [],
				illustrationPrompt: generated.parts[index]?.illustrationPrompt ?? "",
				illustrationKey: key,
			});
		}

		const fullContent = buildStoryContent(parts);

		await db
			.update(schema.stories)
			.set({
				title: generated.title,
				content: fullContent,
				parts,
				coverImageKey: parts[0]?.illustrationKey,
				previewExcerpt: trimPreview(fullContent),
				status: "generated",
				updatedAt: now(),
			})
			.where(eq(schema.stories.id, storyId));
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

export async function createPaymentLinkForStory(input: PaymentRequestInput) {
	const userId = await requireUserId();
	const db = getDb();
	const story = await getOwnedStoryRow(input.storyId, userId);

	if (!story) {
		throw new Error("Cerita tidak ditemukan.");
	}

	if (story.isPaid) {
		return { paymentLink: `${getAppUrl()}/stories/${story.id}` };
	}

	if (story.status !== "generated" && story.status !== "payment_pending") {
		throw new Error("Cerita belum siap untuk dibayar.");
	}

	await ensureProfile(userId, {
		email: input.customerEmail,
		fullName: input.customerName,
		phone: input.customerMobile,
	});

	const current = now();
	await db.insert(schema.storyPayments).values({
		id: nanoid(16),
		storyId: story.id,
		clerkUserId: userId,
		provider: "manual",
		status: "paid",
		amount: STORY_PRICE_IDR,
		currency: "IDR",
		customerName: input.customerName,
		customerEmail: input.customerEmail,
		customerMobile: input.customerMobile,
		rawPayload: { mode: "manual_unlock_bypass" },
		createdAt: current,
		updatedAt: current,
		paidAt: current,
	});

	/*
	Mayar integration is intentionally disabled for now.
	Restore the live gateway flow here when needed:

	const payment = await createMayarPaymentLink({
		name: input.customerName,
		email: input.customerEmail,
		mobile: input.customerMobile,
		amount: STORY_PRICE_IDR,
		description: `Unlock Cerita Anak: ${story.title}`,
		redirectUrl: `${getAppUrl()}/stories/${story.id}?payment=success`,
	});

	await db.insert(schema.storyPayments).values({
		...,
		status: "pending",
		mayarPaymentId: payment.id,
		mayarTransactionId: payment.transactionId,
		paymentLink: payment.paymentLink,
	});

	await db
		.update(schema.stories)
		.set({
			status: "payment_pending",
			updatedAt: current,
		})
		.where(eq(schema.stories.id, story.id));

	return { paymentLink: payment.paymentLink };
	*/

	await finalizeStoryPayment(story.id);

	return {
		paymentLink: `${getAppUrl()}/stories/${story.id}?payment=success`,
	};
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

	if (!story.isPaid || !story.parts.every((part) => part.voiceKey)) {
		throw new Error("Cerita harus sudah dibayar dan punya audio penuh sebelum dipublikasikan.");
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
		publicUrl: publicSlug ? `${getAppUrl()}/s/${publicSlug}` : undefined,
	};
}

async function finalizeStoryPayment(storyId: string) {
	const db = getDb();
	const story = await db.query.stories.findFirst({
		where: eq(schema.stories.id, storyId),
	});

	if (!story) {
		throw new Error("Story not found for payment finalization");
	}

	if (story.isPaid && story.parts.every((part) => part.voiceKey)) {
		return story;
	}

	const { generateStoryAudio } = await import("../providers/elevenlabs.server");
	const paidParts: StoryPartRecord[] = [];
	for (const [index, part] of story.parts.entries()) {
		const audioBuffer = await generateStoryAudio(part.narrations.join(" "));
		const audioKey = `stories/${story.id}/audio/${index}.mp3`;
		await uploadBinaryObject(audioKey, audioBuffer, "audio/mpeg");
		paidParts.push({
			...part,
			voiceKey: audioKey,
		});
	}

	const paidAt = now();
	await db
		.update(schema.stories)
		.set({
			parts: paidParts,
			isPaid: true,
			status: "paid",
			paidAt,
			updatedAt: paidAt,
		})
		.where(eq(schema.stories.id, story.id));

	const refreshed = await db.query.stories.findFirst({
		where: eq(schema.stories.id, story.id),
	});

	if (!refreshed) {
		throw new Error("Story not found after payment finalization");
	}

	return refreshed;
}

/*
Mayar webhook handling is disabled for now.
Re-enable it together with the provider adapter and `/api/mayar/webhook` route when the payment flow is restored.
*/

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
