import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Every route is prerendered, so the build emits plain HTML/RSC files into
	// out/ with no Node server involved. That is what makes this deployable to
	// Cloudflare Workers static assets (or any static host) as-is.
	output: "export",
	reactCompiler: true,
	reactStrictMode: true,
	transpilePackages: ["bungie-api-ts"],
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				hostname: "www.bungie.net",
			},
		],
	},
};

export default nextConfig;
