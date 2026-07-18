import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	reactStrictMode: true,
	images: {
		unoptimized: true,
		remotePatterns: [
			{
				hostname: "bungie.net",
			},
		],
	},
};

export default nextConfig;
