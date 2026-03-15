import { env } from "cloudflare:workers";

export type WorkerSecrets = {
	CLERK_SECRET_KEY: string;
	OPENROUTER_API_KEY: string;
	ELEVENLABS_API_KEY: string;
	MAYAR_API_KEY: string;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
};

function readSecret<K extends keyof WorkerSecrets>(name: K): WorkerSecrets[K] {
	const value = (env as unknown as Record<string, unknown>)[name];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Missing required secret binding: ${name}`);
	}

	return value as WorkerSecrets[K];
}

export function getWorkerSecrets(): WorkerSecrets {
	return {
		CLERK_SECRET_KEY: readSecret("CLERK_SECRET_KEY"),
		OPENROUTER_API_KEY: readSecret("OPENROUTER_API_KEY"),
		ELEVENLABS_API_KEY: readSecret("ELEVENLABS_API_KEY"),
		MAYAR_API_KEY: readSecret("MAYAR_API_KEY"),
		R2_ACCESS_KEY_ID: readSecret("R2_ACCESS_KEY_ID"),
		R2_SECRET_ACCESS_KEY: readSecret("R2_SECRET_ACCESS_KEY"),
	};
}
