import type { HttpClient, HttpClientConfig } from "bungie-api-ts/http";

import { requireBungieApiKey } from "./config";

function stripUndefinedParams(params: Record<string, unknown>) {
	const entries = Object.entries(params).filter(
		([, value]) => value !== undefined,
	);
	return Object.fromEntries(entries) as Record<string, string>;
}

export function createBungieHttpClient(apiKey: string): HttpClient {
	return async <Return>(config: HttpClientConfig) => {
		let { url } = config;
		if (config.params) {
			const params = stripUndefinedParams(
				config.params as Record<string, unknown>,
			);
			const query = new URLSearchParams(
				params as Record<string, string>,
			).toString();
			if (query.length > 0) {
				url = `${url}?${query}`;
			}
		}

		const response = await fetch(url, {
			method: config.method,
			headers: {
				"X-API-Key": apiKey,
				...(config.body ? { "Content-Type": "application/json" } : null),
			},
			body: config.body ? JSON.stringify(config.body) : undefined,
		});

		return (await response.json()) as Return;
	};
}

let cachedClient: HttpClient | null = null;

export function getBungieHttpClient() {
	if (cachedClient) return cachedClient;
	cachedClient = createBungieHttpClient(requireBungieApiKey());
	return cachedClient;
}
