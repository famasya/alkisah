import { createFileRoute } from "@tanstack/react-router";
import { resolveSignedMediaKey } from "~/features/media/asset-token.server";
import { getStoredObject } from "~/features/media/storage.server";
import { getStoryImageAsset } from "~/features/stories/story.server";

export const Route = createFileRoute("/api/media/stories/$storyId/images/$index")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				try {
					const index = Number(params.index);
					const signedKey = await resolveSignedMediaKey({
						storyId: params.storyId,
						index,
						kind: "image",
						request,
					});
					const key = signedKey ?? (await getStoryImageAsset(params.storyId, index)).key;
					const object = await getStoredObject(key);

					if (!object) {
						return new Response("Not found", { status: 404 });
					}

					return new Response(object.body, {
						headers: {
							"Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
							"Cache-Control": "public, max-age=31536000, immutable",
						},
					});
				} catch (error) {
					return new Response(error instanceof Error ? error.message : "Unable to fetch image", {
						status: 404,
					});
				}
			},
		},
	},
});
