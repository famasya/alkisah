import { OpenRouter } from "@openrouter/sdk";
import { getAppUrl, requireEnv } from "~/lib/app-env.server";
import type { CreateStoryInput } from "../stories/story.schemas";

type StoryGenerationResult = {
	title: string;
	parts: Array<{
		order: number;
		narrations: string[];
		illustrationPrompt: string;
	}>;
};

let client: OpenRouter | undefined;

function getClient() {
	client ??= new OpenRouter({
		apiKey: requireEnv("OPENROUTER_API_KEY"),
		httpReferer: getAppUrl(),
		xTitle: "Alkisah",
	});

	return client;
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

function extractJsonBlock(value: string) {
	const fencedMatch = value.match(/```json\s*([\s\S]+?)```/i);
	if (fencedMatch) {
		return fencedMatch[1];
	}

	const firstBrace = value.indexOf("{");
	const lastBrace = value.lastIndexOf("}");

	if (firstBrace >= 0 && lastBrace > firstBrace) {
		return value.slice(firstBrace, lastBrace + 1);
	}

	return value;
}

export async function generateStoryDraft(input: CreateStoryInput): Promise<StoryGenerationResult> {
	const themeDetail = input.customTheme ? `${input.theme} (${input.customTheme})` : input.theme;
	const ageDirection =
		input.age <= 5
			? "Use simple rhythmic language, repetition, concrete imagery, and one gentle idea."
			: "Use accessible language with a clear problem, a few attempts, and a warm resolution.";
	const payload = await getClient().chat.send({
		chatGenerationParams: {
			model: requireEnv("OPENROUTER_TEXT_MODEL"),
			temperature: 0.9,
			responseFormat: { type: "json_object" },
			messages: [
				{
					role: "system",
					content:
						'You write warm Indonesian children\'s stories in Bahasa Indonesia. Follow child-development storytelling principles from the provided guideline: one core idea, complementary picture-text moments, a clear emotional arc, one simple challenge, gentle scaffolding, and a kind moral resolution. For younger readers use predictable rhythm, repetition, and concrete imagery. Respond with strict JSON only using this schema: {"title": string, "parts": [{"order": number, "narrations": string[3|4], "illustrationPrompt": string}]}. Return exactly 4 parts. Each narrations array must contain 3 or 4 short Indonesian sentences. Each illustrationPrompt must be one English sentence for a whimsical pastel storybook illustration that keeps the child character visually consistent across all parts, adds complementary visual details beyond the narration, and clearly describes setting, mood, action, and recurring outfit or visual anchors.',
				},
				{
					role: "user",
					content: `Nama anak: ${input.childName}\nUsia: ${input.age}\nTema: ${themeDetail}\nArahan usia: ${ageDirection}\nTulis cerita personal dalam Bahasa Indonesia sebagai 4 bagian berurutan. Pastikan keseluruhan cerita sekitar 400-800 kata, hangat, visual, lembut, dan cocok dibacakan sebelum tidur.`,
				},
			],
		},
	});
	const rawContent = normalizeMessageContent(payload.choices[0]?.message?.content);
	const parsed = JSON.parse(extractJsonBlock(rawContent)) as Partial<StoryGenerationResult>;

	if (!parsed.title || !Array.isArray(parsed.parts) || parsed.parts.length < 4) {
		throw new Error("OpenRouter returned an incomplete story payload");
	}

	return {
		title: parsed.title.trim(),
		parts: parsed.parts.slice(0, 4).map((part, index) => ({
			order: typeof part?.order === "number" ? part.order : index + 1,
			narrations: Array.isArray(part?.narrations)
				? part.narrations.map((narration) => `${narration ?? ""}`.trim()).filter(Boolean)
				: [],
			illustrationPrompt: `${part?.illustrationPrompt ?? ""}`.trim(),
		})),
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

export async function generateIllustration(prompt: string) {
	const payload = await getClient().chat.send({
		chatGenerationParams: {
			model: requireEnv("OPENROUTER_IMAGE_MODEL"),
			modalities: ["image"],
			messages: [
				{
					role: "user",
					content:
						`Create one square illustrated children's book image in a warm pastel storybook style. ` +
						`Keep the child character design consistent with the story context and avoid text, logos, watermarks, or split panels. ${prompt}`,
				},
			],
		},
	});

	return extractImageSource(
		payload.choices[0]?.message?.content,
		payload.choices[0]?.message?.images?.[0]?.imageUrl?.url,
	);
}
