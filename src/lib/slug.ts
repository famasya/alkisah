export function slugify(value: string) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
}

export function createStorySlug(title: string, storyId: string) {
	const base = slugify(title) || "cerita-anak";
	return `${base}-${storyId.slice(0, 6)}`;
}
