export function getBungieApiKey() {
	return (
		process.env.AUTH_BUNGIE_API_KEY ??
		process.env.BUNGIE_API_KEY ??
		process.env.NEXT_PUBLIC_AUTH_BUNGIE_API_KEY ??
		process.env.NEXT_PUBLIC_BUNGIE_API_KEY ??
		""
	);
}

export function requireBungieApiKey() {
	const apiKey = getBungieApiKey();
	if (!apiKey) {
		throw new Error(
			"Missing Bungie API key. Set AUTH_BUNGIE_API_KEY (or BUNGIE_API_KEY) for server usage.",
		);
	}
	return apiKey;
}
