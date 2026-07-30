const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";

export function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

export function hashStringWithSeed(value: string, seed: number) {
	let hash = (seed ^ 0x9e3779b9) >>> 0;

	for (let index = 0; index < value.length; index += 1) {
		hash = Math.imul(hash ^ value.charCodeAt(index), 2654435761) >>> 0;
		hash = ((hash << 13) | (hash >>> 19)) >>> 0;
	}

	return hash >>> 0;
}

export function isMobileViewport() {
	if (typeof window === "undefined") {
		return false;
	}

	return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
}
