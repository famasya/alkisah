import { env } from "cloudflare:workers";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import { OpenRouter } from "@openrouter/sdk";
import { z } from "zod";
import { getWorkerSecrets } from "~/lib/worker-secrets.server";
import type { CreateStoryInput } from "../stories/story.schemas";

type StoryGenerationResult = {
	title: string;
	characterGuide: string;
	parts: Array<{
		order: number;
		narrations: string[];
		illustrationPrompt: string;
	}>;
};

type StoryPartRegenerationResult = {
	narrations: string[];
	illustrationPrompt: string;
};

const storyGenerationSchema = z.object({
	title: z.string().trim().min(1),
	characterGuide: z.string().trim().min(1),
	parts: z
		.array(
			z.object({
				order: z.number().int().positive().optional(),
				narrations: z.array(z.string().trim().min(1)).min(3).max(4),
				illustrationPrompt: z.string().trim().min(1),
			}),
		)
		.min(3),
});

const storyPartRegenerationSchema = z.object({
	narrations: z.array(z.string().trim().min(1)).min(3).max(4),
	illustrationPrompt: z.string().trim().min(1),
});

let client: OpenRouter | undefined;
let textProvider:
	| ReturnType<typeof createOpenAICompatible<string, string, string, string>>
	| undefined;
const appUrl = env.APP_URL || "http://localhost:3000";

function getClient() {
	const secrets = getWorkerSecrets();
	client ??= new OpenRouter({
		apiKey: secrets.OPENROUTER_API_KEY,
		httpReferer: appUrl,
		xTitle: "Alkisah",
	});

	return client;
}

function getTextProvider() {
	const secrets = getWorkerSecrets();
	textProvider ??= createOpenAICompatible({
		name: "openrouter",
		baseURL: "https://openrouter.ai/api/v1",
		apiKey: secrets.OPENROUTER_API_KEY,
		headers: {
			"HTTP-Referer": appUrl,
			"X-Title": "Alkisah",
		},
		supportsStructuredOutputs: true,
	});

	return textProvider;
}

function normalizeMessageContent(content: unknown) {
	if (typeof content === "string") {
		return content;
	}

	if (Array.isArray(content)) {
		return content
			.map((item) =>
				typeof item === "object" && item && "text" in item && typeof item.text === "string"
					? item.text
					: "",
			)
			.join("\n")
			.trim();
	}

	return "";
}

export async function generateStoryDraft(input: CreateStoryInput): Promise<StoryGenerationResult> {
	const themeDetail = input.customTheme ? `${input.theme} (${input.customTheme})` : input.theme;
	const ageDirection =
		input.age <= 5
			? "Use simple rhythmic language, repetition, concrete imagery, and one gentle idea."
			: "Use accessible language with a clear problem, a few attempts, and a warm resolution.";
	const { output } = await generateText({
		model: getTextProvider().chatModel(env.OPENROUTER_TEXT_MODEL),
		temperature: 0.85,
		output: Output.object({
			schema: storyGenerationSchema,
			name: "alkisah_story_draft",
			description:
				"A complete Indonesian bedtime story draft with a reusable character guide and ordered story parts.",
		}),
		system:
			"You write warm Indonesian children's bedtime stories in Bahasa Indonesia. Follow the children-story guideline explicitly: align the plot to the child's developmental stage, introduce only one new concept at a time, use a simplified story grammar with character introduction, problem, attempts, obstacle, resolution, and emotional lesson, and rely on complementary picture-text storytelling instead of duplicating narration verbatim in the art notes. For ages 3-6 favor repetition, rhythm, concrete imagery, fantasy, empathy, and very clear consequences. For ages 7-10 keep the plot logical, gentle, and easy to follow. Aim for roughly 400 words total and usually 3 to 8 parts, but never truncate the ending just to stay within that range. If the story naturally needs more parts for a satisfying ending, include them. The characterGuide must be one concise English sentence describing the child protagonist with stable age, hairstyle, face shape, skin tone, recurring pajamas or outfit, and one memorable accessory so the same wording can be reused for every image. Each narrations array must contain 3 or 4 short Indonesian sentences. Keep one child protagonist consistently named, one helper figure at most, one central challenge, and a soft moral ending. Each illustrationPrompt must be one English sentence for a whimsical pastel storybook illustration that keeps the child character visually consistent across all parts, adds complementary visual details beyond the narration, and clearly describes setting, mood, action, and recurring outfit or visual anchors. Use the exact same character terms as the characterGuide and prioritize character consistency over background details.",
		prompt: `Nama anak: ${input.childName}\nUsia: ${input.age}\nTema: ${themeDetail}\nArahan usia: ${ageDirection}\nTulis cerita personal dalam Bahasa Indonesia sebagai beberapa bagian berurutan. Biasanya 3 sampai 8 bagian, tetapi selesaikan cerita dengan ending yang utuh walau perlu lebih banyak bagian. Targetkan total cerita sekitar 400 kata, tetap hangat, visual, lembut, dan cocok dibacakan sebelum tidur.`,
	});
	const parsed = storyGenerationSchema.parse(output);

	return {
		title: parsed.title.trim(),
		characterGuide: parsed.characterGuide.trim(),
		parts: parsed.parts.map((part, index) => ({
			order: typeof part?.order === "number" ? part.order : index + 1,
			narrations: Array.isArray(part?.narrations)
				? part.narrations.map((narration) => `${narration ?? ""}`.trim()).filter(Boolean)
				: [],
			illustrationPrompt: `${part?.illustrationPrompt ?? ""}`.trim(),
		})),
	};
}

export async function regenerateStorySection(input: {
	childName: string;
	age: number;
	theme: string;
	customTheme?: string | null;
	title: string;
	characterGuide?: string;
	currentSectionOrder: number;
	currentNarrations: string[];
	allSections: Array<{ order: number; narrations: string[] }>;
	prompt: string;
}): Promise<StoryPartRegenerationResult> {
	const themeDetail = input.customTheme ? `${input.theme} (${input.customTheme})` : input.theme;
	const sectionsContext = input.allSections
		.map((section) => `Bagian ${section.order}: ${section.narrations.join(" ")}`)
		.join("\n");

	const { output } = await generateText({
		model: getTextProvider().chatModel(env.OPENROUTER_TEXT_MODEL),
		temperature: 0.9,
		output: Output.object({
			schema: storyPartRegenerationSchema,
			name: "alkisah_story_part_regeneration",
			description:
				"An updated Indonesian story section that preserves continuity with the surrounding sections.",
		}),
		system:
			"You rewrite one section of an Indonesian children's story. Follow the same children-story guideline as the full story generator: age-appropriate, warm, concrete, emotionally safe, and easy to read aloud. Preserve continuity with the rest of the story, keep the same protagonist, and do not introduce a new plot that breaks the ending. Return 3 or 4 short Indonesian narration sentences plus one English illustration prompt for a whimsical pastel storybook image. The illustration prompt must reuse the exact same character wording and outfit/accessory anchors when a character guide is provided.",
		prompt:
			`Judul cerita: ${input.title}\n` +
			`Nama anak: ${input.childName}\n` +
			`Usia: ${input.age}\n` +
			`Tema: ${themeDetail}\n` +
			`${input.characterGuide ? `Character guide: ${input.characterGuide}\n` : ""}` +
			`Bagian yang diubah: ${input.currentSectionOrder}\n` +
			`Narasi bagian saat ini: ${input.currentNarrations.join(" ")}\n` +
			`Konteks semua bagian:\n${sectionsContext}\n\n` +
			`Instruksi pengguna untuk bagian ini: ${input.prompt}\n\n` +
			"Buat ulang hanya bagian tersebut. Pertahankan posisi bagian dalam alur cerita, jangan ubah bagian lain, dan pastikan hasilnya tetap selaras dengan awal serta akhir cerita.",
	});

	const parsed = storyPartRegenerationSchema.parse(output);

	return {
		narrations: parsed.narrations.map((narration) => narration.trim()).filter(Boolean),
		illustrationPrompt: parsed.illustrationPrompt.trim(),
	};
}

function extractImageSource(content: unknown, imageUrl: string | undefined) {
	if (imageUrl) {
		return imageUrl;
	}

	const rawContent = normalizeMessageContent(content);
	const markdownImage = rawContent.match(
		/\((https?:\/\/[^)\s]+|data:image\/[a-zA-Z+]+;base64,[^)]+)\)/,
	)?.[1];
	if (markdownImage) {
		return markdownImage;
	}

	const inlineDataUrl = rawContent.match(/data:image\/[a-zA-Z+]+;base64,[A-Za-z0-9+/=]+/)?.[0];
	if (inlineDataUrl) {
		return inlineDataUrl;
	}

	const inlineUrl = rawContent.match(/https?:\/\/\S+/)?.[0];
	if (inlineUrl) {
		return inlineUrl;
	}

	throw new Error("OpenRouter did not return an illustration URL");
}

export async function generateIllustration(prompt: string, characterGuide?: string) {
	const payload = await getClient().chat.send({
		chatGenerationParams: {
			model: env.OPENROUTER_IMAGE_MODEL,
			modalities: ["image"],
			messages: [
				{
					role: "user",
					content:
						`Create one square illustrated children's book image in a warm pastel storybook style. ` +
						`Keep the main child character identical across scenes with the same face, hair, body proportions, outfit details, and accessory. ` +
						`Use exactly the same character wording every time and prioritize character consistency over background changes. ` +
						`Avoid text, logos, watermarks, split panels, or extra protagonist variants. ` +
						`${characterGuide ? `Character guide: ${characterGuide}. ` : ""}${prompt}`,
				},
			],
		},
	});

	return extractImageSource(
		payload.choices[0]?.message?.content,
		payload.choices[0]?.message?.images?.[0]?.imageUrl?.url,
	);
}
