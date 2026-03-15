import { createServerFn } from "@tanstack/react-start";
import {
	createPaymentLinkForStory,
	createStory,
	getOwnedStory,
	getPublicStory,
	getViewer,
	listPublicStories,
	setStoryPublicState,
} from "./story.server";
import {
	createStorySchema,
	libraryQuerySchema,
	paymentRequestSchema,
	publicStorySchema,
	storyIdSchema,
	storyPublicSchema,
} from "./story.schemas";

export const getViewerFn = createServerFn({ method: "GET" }).handler(() => getViewer());

export const createStoryFn = createServerFn({ method: "POST" })
	.inputValidator((value) => createStorySchema.parse(value))
	.handler(({ data }) => createStory(data));

export const getOwnedStoryFn = createServerFn({ method: "GET" })
	.inputValidator((value) => storyIdSchema.parse(value))
	.handler(({ data }) => getOwnedStory(data.storyId));

export const getPublicStoryFn = createServerFn({ method: "GET" })
	.inputValidator((value) => publicStorySchema.parse(value))
	.handler(({ data }) => getPublicStory(data.slug));

export const listPublicStoriesFn = createServerFn({ method: "GET" })
	.inputValidator((value) => libraryQuerySchema.parse(value))
	.handler(({ data }) => listPublicStories(data));

export const createPaymentLinkFn = createServerFn({ method: "POST" })
	.inputValidator((value) => paymentRequestSchema.parse(value))
	.handler(({ data }) => createPaymentLinkForStory(data));

export const setStoryPublicStateFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyPublicSchema.parse(value))
	.handler(({ data }) => setStoryPublicState(data));
