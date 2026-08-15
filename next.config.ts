import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
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
