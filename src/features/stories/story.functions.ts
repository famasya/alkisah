import { createServerFn } from "@tanstack/react-start";
import {
	createPaymentLinkForStory,
	createStory,
	generateStoryPartAudio,
	getOwnedStory,
	getPublicStory,
	getViewer,
	listPublicStories,
	processStoryIllustrations,
	setStoryPublicState,
} from "./story.server";
import {
	createStorySchema,
	libraryQuerySchema,
	paymentRequestSchema,
	publicStorySchema,
	storyPartAudioSchema,
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

export const processStoryIllustrationsFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyIdSchema.parse(value))
	.handler(({ data }) => processStoryIllustrations(data.storyId));

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

export const generateStoryPartAudioFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyPartAudioSchema.parse(value))
	.handler(({ data }) => generateStoryPartAudio(data.storyId, data.index));
