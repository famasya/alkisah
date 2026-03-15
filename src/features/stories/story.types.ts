export const storyStatuses = [
	"draft",
	"generating",
	"generated",
	"payment_pending",
	"paid",
	"failed",
] as const;

export type StoryStatus = (typeof storyStatuses)[number];

export type StoryPart = {
	order: number;
	narrations: string[];
	regenerationAttempts: number;
	illustrationStatus: "queued" | "generating" | "generated" | "failed";
	illustrationFailureReason?: string;
	illustrationUrl?: string;
	voiceStatus: "queued" | "generating" | "generated" | "failed";
	voiceFailureReason?: string;
	voiceUrl?: string;
};

export type StoryLibraryCard = {
	id: string;
	title: string;
	theme: string;
	age: number;
	coverImageUrl?: string;
	previewExcerpt?: string;
	viewsCount: number;
	publicSlug: string;
	createdAt: string;
};

export type StoryPrivateLibraryCard = {
	id: string;
	title: string;
	theme: string;
	age: number;
	coverImageUrl?: string;
	previewExcerpt?: string;
	createdAt: string;
	paidAt?: string | null;
	isPublic: boolean;
	publicSlug?: string | null;
};

export type StoryDetail = {
	id: string;
	title: string;
	content: string;
	childName: string;
	theme: string;
	customTheme?: string | null;
	age: number;
	status: StoryStatus;
	isPaid: boolean;
	isPublic: boolean;
	publicSlug?: string | null;
	viewsCount: number;
	createdAt: string;
	paidAt?: string | null;
	previewExcerpt?: string | null;
	coverImageUrl?: string;
	pendingPaymentLink?: string | null;
	parts: StoryPart[];
	canListenToPaidAudio: boolean;
	failureReason?: string | null;
};

export type StoryLibraryResult = {
	items: StoryLibraryCard[];
	page: number;
	pageSize: number;
	sort: "newest" | "popular";
	totalItems: number;
	hasNextPage: boolean;
};

export type StoryPrivateLibraryResult = {
	items: StoryPrivateLibraryCard[];
	page: number;
	pageSize: number;
	totalItems: number;
	hasNextPage: boolean;
};
