import { createFileRoute } from "@tanstack/react-router";
import { handleMayarWebhook } from "~/features/stories/story.server";

export const Route = createFileRoute("/api/mayar/webhook")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					const payload = (await request.json()) as Record<string, unknown>;
					await handleMayarWebhook(payload);

					return new Response("ok", {
						status: 200,
					});
				} catch (error) {
					return new Response(error instanceof Error ? error.message : "Webhook error", {
						status: 500,
					});
				}
			},
		},
	},
});
