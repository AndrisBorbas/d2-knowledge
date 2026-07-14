import Bungie from "@auth/solid-start/providers/bungie";
import type { StartAuthJSConfig } from "start-authjs";
import { serverEnv } from "~/env/server";

export interface BungieProfile {
	bungieNetUser: {
		membershipId: string;
		displayName: string;
		profilePicturePath: string;
	};
}

export const authConfig: StartAuthJSConfig = {
	secret: serverEnv.AUTH_SECRET,
	providers: [
		// https://github.com/owens1127/next-auth/blob/bcde927482e5fd0956d11846d1e400aad0162101/packages/core/src/providers/bungie.ts
		Bungie({
			authorization: {
				url: "https://www.bungie.net/en/OAuth/Authorize",
				params: { scope: "" },
			},
			userinfo: {
				url: "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
				async request({
					tokens,
					provider,
				}: {
					tokens: { access_token?: string };
					provider: { userinfo?: { url?: string | URL } };
				}) {
					return await fetch(provider.userinfo?.url as URL, {
						headers: {
							Authorization: `Bearer ${tokens.access_token}`,
							"X-API-KEY": serverEnv.AUTH_BUNGIE_API_KEY,
						},
					})
						.then(async (res) => await res.json())
						.then((res) => res.Response);
				},
			},
			profile(profile) {
				const { bungieNetUser: user } = profile;

				return {
					id: user.membershipId,
					name: user.displayName,
					email: null,
					image: `https://www.bungie.net${
						user.profilePicturePath.startsWith("/") ? "" : "/"
					}${user.profilePicturePath}`,
				};
			},
			clientId: serverEnv.AUTH_BUNGIE_ID,
			clientSecret: serverEnv.AUTH_BUNGIE_SECRET,
		}),
	],
	debug: false,
	basePath: new URL(serverEnv.AUTH_URL!).pathname,
};
