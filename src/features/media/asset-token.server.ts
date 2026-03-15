import { env } from "cloudflare:workers";
import { AwsClient } from "aws4fetch";
import { getWorkerSecrets } from "~/lib/worker-secrets.server";

const MEDIA_URL_TTL_SECONDS = 60 * 60 * 6;

let client: AwsClient | undefined;

function isLocalDevelopment() {
	return import.meta.env.DEV;
}

function readEnvString(name: string) {
	const value = (env as unknown as Record<string, unknown>)[name];
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

function getBucketName() {
	return readEnvString("MEDIA_BUCKET_NAME");
}

function getAccountId() {
	return readEnvString("R2_ACCOUNT_ID");
}

function getClient() {
	const secrets = getWorkerSecrets();
	client ??= new AwsClient({
		accessKeyId: secrets.R2_ACCESS_KEY_ID,
		secretAccessKey: secrets.R2_SECRET_ACCESS_KEY,
		service: "s3",
		region: "auto",
	});

	return client;
}

function encodeObjectKey(key: string) {
	return key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

export async function createSignedMediaUrl(input: {
	index: number;
	key: string;
	kind: "audio" | "image";
	storyId: string;
}) {
	if (isLocalDevelopment()) {
		const mediaPath = input.kind === "image" ? "images" : "audio";
		return `/api/media/stories/${input.storyId}/${mediaPath}/${input.index}`;
	}

	const url = new URL(
		`https://${getAccountId()}.r2.cloudflarestorage.com/${getBucketName()}/${encodeObjectKey(input.key)}`,
	);
	url.searchParams.set("X-Amz-Expires", `${MEDIA_URL_TTL_SECONDS}`);
	const signedRequest = await getClient().sign(url, {
		method: "GET",
		aws: {
			signQuery: true,
		},
	});

	return signedRequest.url;
}
