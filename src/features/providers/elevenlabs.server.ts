import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { requireEnv } from "~/lib/app-env.server";

let client: ElevenLabsClient | undefined;

function getClient() {
	client ??= new ElevenLabsClient({
		apiKey: requireEnv("ELEVENLABS_API_KEY"),
	});

	return client;
}

function getErrorDetail(body: unknown) {
	if (typeof body === "string") {
		return body;
	}

	if (body && typeof body === "object") {
		for (const key of ["detail", "message", "error"]) {
			const value = (body as Record<string, unknown>)[key];
			if (typeof value === "string" && value.trim().length > 0) {
				return value;
			}
		}

		try {
			return JSON.stringify(body);
		} catch {
			return undefined;
		}
	}

	return undefined;
}

export async function generateStoryAudio(content: string) {
	const voiceId = requireEnv("ELEVENLABS_VOICE_ID");
	try {
		const audioStream = await getClient().textToSpeech.convert(voiceId, {
			text: content,
			modelId: "eleven_multilingual_v2",
			outputFormat: "mp3_44100_128",
		});

		return await new Response(audioStream).arrayBuffer();
	} catch (error) {
		if (error instanceof ElevenLabsError) {
			const detail = getErrorDetail(error.body);
			const message = detail
				? `Failed to generate ElevenLabs audio (${error.statusCode}): ${detail}`
				: `Failed to generate ElevenLabs audio (${error.statusCode})`;
			throw new Error(message);
		}

		throw error;
	}
}
