import { requireEnv } from "~/lib/app-env.server";

type MediaAssetKind = "audio" | "image";

const MEDIA_TOKEN_TTL_MS = 1000 * 60 * 60 * 6;

const encoder = new TextEncoder();
let signingKeyPromise: Promise<CryptoKey> | undefined;

function encodeBase64Url(value: ArrayBuffer | Uint8Array) {
	const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
	let binary = "";

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function buildPayload(input: {
	expiresAt: number;
	index: number;
	key: string;
	kind: MediaAssetKind;
	storyId: string;
}) {
	return [input.storyId, input.kind, input.index, input.key, input.expiresAt].join(":");
}

async function getSigningKey() {
	signingKeyPromise ??= crypto.subtle.importKey(
		"raw",
		encoder.encode(requireEnv("CLERK_SECRET_KEY")),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	return signingKeyPromise;
}

async function signPayload(payload: string) {
	return encodeBase64Url(
		await crypto.subtle.sign("HMAC", await getSigningKey(), encoder.encode(payload)),
	);
}

export async function createSignedMediaUrl(input: {
	index: number;
	key: string;
	kind: MediaAssetKind;
	storyId: string;
}) {
	const expiresAt = Date.now() + MEDIA_TOKEN_TTL_MS;
	const signature = await signPayload(
		buildPayload({
			...input,
			expiresAt,
		}),
	);

	const mediaPath = input.kind === "image" ? "images" : "audio";
	const searchParams = new URLSearchParams({
		exp: `${expiresAt}`,
		key: input.key,
		sig: signature,
	});

	return `/api/media/stories/${input.storyId}/${mediaPath}/${input.index}?${searchParams.toString()}`;
}

export async function resolveSignedMediaKey(input: {
	index: number;
	kind: MediaAssetKind;
	request: Request;
	storyId: string;
}) {
	const url = new URL(input.request.url);
	const key = url.searchParams.get("key");
	const expiresAt = Number(url.searchParams.get("exp"));
	const signature = url.searchParams.get("sig");

	if (!key || !signature || !Number.isFinite(expiresAt)) {
		return undefined;
	}

	if (Date.now() > expiresAt) {
		throw new Error("Media token expired");
	}

	const expectedSignature = await signPayload(
		buildPayload({
			...input,
			expiresAt,
			key,
		}),
	);

	if (expectedSignature !== signature) {
		throw new Error("Invalid media token");
	}

	return key;
}
