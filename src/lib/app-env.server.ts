import { env } from "cloudflare:workers";

type StringEnvKey = keyof Pick<
	Env,
	| "APP_URL"
	| "CLERK_SECRET_KEY"
	| "VITE_CLERK_PUBLISHABLE_KEY"
	| "OPENROUTER_API_KEY"
	| "OPENROUTER_TEXT_MODEL"
	| "OPENROUTER_IMAGE_MODEL"
	| "ELEVENLABS_API_KEY"
	| "ELEVENLABS_VOICE_ID"
	| "MAYAR_API_KEY"
	| "MAYAR_API_BASE_URL"
>;

export function getAppEnv() {
	return env;
}

export function getOptionalEnv(name: StringEnvKey) {
	const value = getAppEnv()[name];
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
