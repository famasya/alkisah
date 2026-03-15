import { createFileRoute } from "@tanstack/react-router";
import { getStoredObject } from "~/features/media/storage.server";
import { getStoryAudioAsset } from "~/features/stories/story.server";

export const Route = createFileRoute("/api/media/stories/$storyId/audio/$index")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				try {
					const index = Number(params.index);
					const key = (await getStoryAudioAsset(params.storyId, index)).key;
					const object = await getStoredObject(key);

					if (!object) {
						return new Response("Not found", { status: 404 });
					}

					return new Response(object.body, {
						headers: {
							"Content-Type": object.httpMetadata?.contentType ?? "audio/mpeg",
							"Cache-Control": "public, max-age=31536000, immutable",
						},
					});
				} catch (error) {
					return new Response(error instanceof Error ? error.message : "Unable to fetch audio", {
						status: 404,
					});
				}
			},
		},
	},
});
