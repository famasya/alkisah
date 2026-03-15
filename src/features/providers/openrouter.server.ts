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

const MIN_NARRATION_WORDS = 7;

function countWords(value: string) {
	return value.trim().split(/\s+/).filter(Boolean).length;
}

const narrationSentenceSchema = z
	.string()
	.trim()
	.min(1)
	.refine((value) => countWords(value) >= MIN_NARRATION_WORDS, {
		message: `Each narration sentence must contain at least ${MIN_NARRATION_WORDS} words.`,
	});

const storyWriterBaseSystemPrompt = `
You are a professional children's story writer.

Your task is to create engaging, age-appropriate children's stories that are imaginative, emotionally warm, and easy to understand.

GENERAL RULES
- Target age: 4-8 years old
- Language must be simple and clear
- Avoid complex vocabulary
- Sentences should be short and rhythmic
- Stories must be safe and positive
- No violence, horror, or frightening themes
- Focus on friendship, curiosity, kindness, courage, or problem solving
- The story should contain a gentle lesson but should not sound preachy

STORY STRUCTURE

Follow this narrative structure:

1. INTRODUCTION
Introduce the main character and their world.

2. PROBLEM
The character faces a small but meaningful challenge.

3. ATTEMPTS
The character tries to solve the problem. The first attempt fails. The second attempt almost works.

4. TWIST
An unexpected idea, friend, or discovery changes the situation.

5. RESOLUTION
The problem is solved and the character learns something meaningful.

STYLE

- Use vivid, visual descriptions suitable for illustration.
- Emphasize emotions and actions instead of explanations.
- Include playful or surprising moments.
- Use repetition or patterns when appropriate.

ALKISAH REQUIREMENTS
- Write the story in Bahasa Indonesia.
- Personalize the child protagonist using the provided name, age, and theme.
- Keep one child protagonist consistently named and use at most one helper figure.
- The tone should feel warm, cozy, and satisfying to read aloud before bedtime.
- For age 3, lean toward the youngest end of the target range.
- For ages 9-10, keep the language inside the same simple 4-8 readability band while allowing slightly more logical problem solving.
- Never rush the ending.
`.trim();

const fullStorySystemPrompt = `
${storyWriterBaseSystemPrompt}

OUTPUT RULES
- Usually produce 4 to 6 story parts. Use 7 parts only when needed for a natural ending.
- Each part must contain 4 or 5 complete Indonesian narration sentences.
- Each narration sentence should usually be medium length, smooth when read aloud, and never feel clipped or fragment-like.
- Aim for roughly 450 to 650 words total.
- The characterGuide must be one concise English sentence describing the child protagonist with stable age, hairstyle, face shape, skin tone, recurring pajamas or outfit, and one memorable accessory so the same wording can be reused for every image.
- Each illustrationPrompt must be one English sentence for a whimsical pastel storybook illustration that keeps the child character visually consistent across all parts, adds complementary visual details beyond the narration, and clearly describes setting, mood, action, and recurring outfit or visual anchors.
- Use the exact same character terms as the characterGuide and prioritize character consistency over background details.
`.trim();

const sectionRewriteSystemPrompt = `
${storyWriterBaseSystemPrompt}

SECTION REWRITE RULES
- Rewrite only one section while preserving continuity with the surrounding sections.
- Return 4 or 5 complete Indonesian narration sentences.
- Keep the sentences fuller and more flowing than short one-liners.
- Do not introduce a brand new plot or break the current ending.
- The illustrationPrompt must be one English sentence for a whimsical pastel storybook illustration that reuses the exact same character wording and outfit or accessory anchors when a character guide is provided.
`.trim();

const storyGenerationSchema = z.object({
	title: z.string().trim().min(1),
	characterGuide: z.string().trim().min(1),
	parts: z
		.array(
			z.object({
				order: z.number().int().positive().optional(),
				narrations: z.array(narrationSentenceSchema).min(4).max(5),
				illustrationPrompt: z.string().trim().min(1),
			}),
		)
		.min(3),
});

const storyPartRegenerationSchema = z.object({
	narrations: z.array(narrationSentenceSchema).min(4).max(5),
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
		input.age <= 4
			? "Gunakan kosakata yang sangat sederhana, ritme lembut, pengulangan ringan, dan gambaran yang konkret."
			: input.age <= 8
				? "Gunakan bahasa sederhana, emosi yang hangat, dan masalah kecil yang mudah diikuti."
				: "Tetap gunakan bahasa sederhana seperti bacaan usia 4-8, tetapi biarkan pemecahan masalah terasa sedikit lebih logis.";
	const { output } = await generateText({
		model: getTextProvider().chatModel(env.OPENROUTER_TEXT_MODEL),
		temperature: 0.85,
		output: Output.object({
			schema: storyGenerationSchema,
			name: "alkisah_story_draft",
			description:
				"A complete Indonesian bedtime story draft with a reusable character guide and ordered story parts.",
		}),
		system: fullStorySystemPrompt,
		prompt:
			`Nama anak: ${input.childName}\n` +
			`Usia: ${input.age}\n` +
			`Tema: ${themeDetail}\n` +
			`Arahan usia: ${ageDirection}\n\n` +
			"Tulis cerita personal lengkap dalam Bahasa Indonesia.\n" +
			"Ikuti alur ini dengan jelas: pengenalan, masalah kecil, percobaan pertama gagal, percobaan kedua hampir berhasil, twist hangat, lalu resolusi yang memuaskan.\n" +
			"Buat narasi terasa utuh, lembut, visual, dan enak dibacakan, bukan potongan kalimat yang terlalu pendek.\n" +
			"Jaga cerita tetap aman, positif, hangat, dan cocok untuk dibacakan sebelum tidur.",
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
		system: sectionRewriteSystemPrompt,
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
			"Buat ulang hanya bagian tersebut. Pertahankan posisi bagian dalam alur cerita, jangan ubah bagian lain, pastikan hasilnya tetap selaras dengan awal serta akhir cerita, dan hindari kalimat yang terlalu pendek atau terasa terputus-putus.",
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
