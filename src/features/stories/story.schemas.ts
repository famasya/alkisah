import { z } from "zod";

const normalizeOptional = (value: string | undefined) => {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
};

export const createStorySchema = z
	.object({
		childName: z.string().trim().min(2).max(40),
		age: z.coerce.number().int().min(3).max(10),
		theme: z.string().trim().min(2).max(40),
		customTheme: z.string().optional().transform(normalizeOptional),
		mode: z.enum(["free", "paid"]).default("free"),
		customerName: z.string().optional().transform(normalizeOptional),
		customerEmail: z.string().optional().transform(normalizeOptional).pipe(z.email().optional()),
		customerMobile: z.string().optional().transform(normalizeOptional),
	})
	.superRefine((value, ctx) => {
		if (value.mode !== "paid") {
			return;
		}

		if (!value.customerName) {
			ctx.addIssue({
				code: "custom",
				path: ["customerName"],
				message: "Nama orang tua wajib diisi untuk cerita berbayar.",
			});
		}

		if (!value.customerEmail) {
			ctx.addIssue({
				code: "custom",
				path: ["customerEmail"],
				message: "Email wajib diisi untuk cerita berbayar.",
			});
		}

		if (
			!value.customerMobile ||
			value.customerMobile.length < 8 ||
			value.customerMobile.length > 20
		) {
			ctx.addIssue({
				code: "custom",
				path: ["customerMobile"],
				message: "Nomor WhatsApp / mobile wajib diisi dengan format yang valid.",
			});
		}
	});

export const paymentRequestSchema = z.object({
	storyId: z.string().trim().min(1),
	customerName: z.string().trim().min(2).max(100),
	customerEmail: z.string().trim().email(),
	customerMobile: z.string().trim().min(8).max(20),
});

export const storyPublicSchema = z.object({
	storyId: z.string().trim().min(1),
	isPublic: z.boolean(),
});

export const storyIdSchema = z.object({
	storyId: z.string().trim().min(1),
});

export const storyPartAudioSchema = storyIdSchema.extend({
	index: z.coerce.number().int().min(0),
});

export const storyPaymentConfirmationSchema = storyIdSchema;

export const storyPartIllustrationSchema = storyIdSchema.extend({
	index: z.coerce.number().int().min(0),
});

export const storyPartRegenerationSchema = storyPartIllustrationSchema.extend({
	prompt: z.string().trim().min(5).max(400),
});

export const publicStorySchema = z.object({
	slug: z.string().trim().min(1),
});

export const mediaStorySchema = z.object({
	storyId: z.string().trim().min(1),
});

export const mediaImageSchema = mediaStorySchema.extend({
	index: z.coerce.number().int().min(0),
});

export const libraryQuerySchema = z.object({
	sort: z.enum(["newest", "popular"]).default("newest"),
	page: z.coerce.number().int().min(1).default(1),
});

export const privateLibraryQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;
export type StoryPublicInput = z.infer<typeof storyPublicSchema>;
export type LibraryQueryInput = z.infer<typeof libraryQuerySchema>;
export type PrivateLibraryQueryInput = z.infer<typeof privateLibraryQuerySchema>;
export type StoryPartAudioInput = z.infer<typeof storyPartAudioSchema>;
export type StoryPartIllustrationInput = z.infer<typeof storyPartIllustrationSchema>;
export type StoryPartRegenerationInput = z.infer<typeof storyPartRegenerationSchema>;
export type StoryPaymentConfirmationInput = z.infer<typeof storyPaymentConfirmationSchema>;
