import { getAppEnv } from "~/lib/app-env.server";

export async function uploadBinaryObject(
	key: string,
	body: ArrayBuffer | ArrayBufferView | string,
	contentType: string,
) {
	await getAppEnv().MEDIA_BUCKET.put(key, body, {
		httpMetadata: {
			contentType,
			cacheControl: "public, max-age=31536000, immutable",
		},
	});

	return key;
}

export async function getStoredObject(key: string) {
	return getAppEnv().MEDIA_BUCKET.get(key);
}
