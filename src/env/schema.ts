import { z } from "zod";

export const serverScheme = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	AUTH_SECRET: z.string(),
	AUTH_TRUST_HOST: z.string().optional(),
	AUTH_URL: z.string().optional(),
	AUTH_BUNGIE_ID: z.string(),
	AUTH_BUNGIE_SECRET: z.string(),
	AUTH_BUNGIE_API_KEY: z.string(),
});

export const clientScheme = z.object({
	MODE: z.enum(["development", "production", "test"]).default("development"),
});
