import { createServerFn } from "@tanstack/react-start";
import {
	confirmStoryPaymentFromRedirect,
	createPaymentLinkForStory,
	createStory,
	generateStoryPartAudio,
	getOwnedStory,
	getPublicStory,
	getViewer,
	listPrivateStories,
	listPublicStories,
	processStoryIllustrations,
	regenerateStoryPart,
	retryStoryPartIllustration,
	setStoryPublicState,
} from "./story.server";
import {
	createStorySchema,
	libraryQuerySchema,
	paymentRequestSchema,
	privateLibraryQuerySchema,
	publicStorySchema,
	storyPartAudioSchema,
	storyPartIllustrationSchema,
	storyPaymentConfirmationSchema,
	storyPartRegenerationSchema,
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

export const retryStoryPartIllustrationFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyPartIllustrationSchema.parse(value))
	.handler(({ data }) => retryStoryPartIllustration(data.storyId, data.index));

export const getPublicStoryFn = createServerFn({ method: "GET" })
	.inputValidator((value) => publicStorySchema.parse(value))
	.handler(({ data }) => getPublicStory(data.slug));

export const listPublicStoriesFn = createServerFn({ method: "GET" })
	.inputValidator((value) => libraryQuerySchema.parse(value))
	.handler(({ data }) => listPublicStories(data));

export const listPrivateStoriesFn = createServerFn({ method: "GET" })
	.inputValidator((value) => privateLibraryQuerySchema.parse(value))
	.handler(({ data }) => listPrivateStories(data));

export const createPaymentLinkFn = createServerFn({ method: "POST" })
	.inputValidator((value) => paymentRequestSchema.parse(value))
	.handler(({ data }) => createPaymentLinkForStory(data));

export const confirmStoryPaymentFromRedirectFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyPaymentConfirmationSchema.parse(value))
	.handler(({ data }) => confirmStoryPaymentFromRedirect(data.storyId));

export const setStoryPublicStateFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyPublicSchema.parse(value))
	.handler(({ data }) => setStoryPublicState(data));

export const generateStoryPartAudioFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyPartAudioSchema.parse(value))
	.handler(({ data }) => generateStoryPartAudio(data.storyId, data.index));

export const regenerateStoryPartFn = createServerFn({ method: "POST" })
	.inputValidator((value) => storyPartRegenerationSchema.parse(value))
	.handler(({ data }) => regenerateStoryPart(data.storyId, data.index, data.prompt));
