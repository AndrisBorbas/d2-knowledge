import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site/meta";

// A static export only emits route handlers that opt into static rendering.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: { userAgent: "*", allow: "/" },
		sitemap: `${SITE_URL}/sitemap.xml`,
	};
}
