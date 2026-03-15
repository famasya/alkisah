import { env } from "cloudflare:workers";

export async function uploadBinaryObject(
	key: string,
	body: ArrayBuffer | ArrayBufferView | string,
	contentType: string,
) {
	await env.MEDIA_BUCKET.put(key, body, {
		httpMetadata: {
			contentType,
			cacheControl: "public, max-age=31536000, immutable",
		},
	});

	return key;
}

export async function getStoredObject(key: string) {
	return env.MEDIA_BUCKET.get(key);
}
