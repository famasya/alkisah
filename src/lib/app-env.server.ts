import { env } from "cloudflare:workers";

export type AppEnv = Env & {
	DB: D1Database;
	MEDIA_BUCKET: R2Bucket;
	APP_URL?: string;
	CLERK_SECRET_KEY?: string;
	VITE_CLERK_PUBLISHABLE_KEY?: string;
	OPENROUTER_API_KEY?: string;
	OPENROUTER_TEXT_MODEL?: string;
	OPENROUTER_IMAGE_MODEL?: string;
	ELEVENLABS_API_KEY?: string;
	ELEVENLABS_VOICE_ID?: string;
	MAYAR_API_KEY?: string;
	MAYAR_API_BASE_URL?: string;
};

type StringEnvKey =
	| "APP_URL"
	| "CLERK_SECRET_KEY"
	| "VITE_CLERK_PUBLISHABLE_KEY"
	| "OPENROUTER_API_KEY"
	| "OPENROUTER_TEXT_MODEL"
	| "OPENROUTER_IMAGE_MODEL"
	| "ELEVENLABS_API_KEY"
	| "ELEVENLABS_VOICE_ID"
	| "MAYAR_API_KEY"
	| "MAYAR_API_BASE_URL";

export function getAppEnv() {
	return env as AppEnv;
}

export function getOptionalEnv(name: StringEnvKey) {
	const value = (getAppEnv() as unknown as Record<string, unknown>)[name];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function requireEnv(name: StringEnvKey) {
	const value = getOptionalEnv(name);
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export function getAppUrl() {
	return getOptionalEnv("APP_URL") ?? "http://localhost:3000";
}
