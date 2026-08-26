// Deterministic stand-in for a random sample, for anything that has to be
// picked during a prerender. Striding the whole list keeps the result spread
// across the source order instead of clustering at the front, which matters
// when entries are grouped by tab.
export function pickEvenlySpaced<T>(items: T[], count: number): T[] {
	const size = Math.min(count, items.length);
	if (size <= 0) return [];

	const stride = items.length / size;
	return Array.from(
		{ length: size },
		(_, index) => items[Math.floor(index * stride)],
	);
}
