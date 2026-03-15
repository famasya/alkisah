export function now() {
	return new Date();
}

export function startOfUtcDay(date = now()) {
	return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function toIsoDate(date = now()) {
	return date.toISOString();
}
