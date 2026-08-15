import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Analytics } from "@/components/Analytics";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { loadCompendiumDataset } from "@/lib/compendium/load";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site/meta";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const siteUrl = SITE_URL;
const siteName = SITE_NAME;
const siteDescription = SITE_DESCRIPTION;

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: `${siteName} | Destiny 2 Knowledge Base`,
		template: `%s | ${siteName}`,
	},
	description: siteDescription,
	applicationName: siteName,
	keywords: [
		"Owl Sector",
		"Destiny 2",
		"Destiny 2 knowledge base",
		"Destiny 2 perks",
		"Destiny 2 wiki",
		"Destiny 2 database",
		"Destiny 2 mechanics",
		"Destiny 2 hidden mechanics",
		"Destiny 2 compendium",
		"Destiny 2 Clarity",
	],
	authors: [{ name: "Owl Sector" }],
	creator: "Owl Sector",
	publisher: "Owl Sector",
	category: "gaming",
	icons: {
		icon: [
			{ url: "/assets/icons/owlsector_small.svg", type: "image/svg+xml" },
			{
				url: "/assets/icons/owlsector64x.png",
				sizes: "64x64",
				type: "image/png",
			},
			{
				url: "/assets/icons/owlsector16x.png",
				sizes: "16x16",
				type: "image/png",
			},
		],
		shortcut: ["/favicon.ico"],
		apple: [{ url: "/assets/icons/owlsector64x.png", type: "image/png" }],
	},
	openGraph: {
		type: "website",
		url: siteUrl,
		siteName,
		title: `${siteName} | Destiny 2 Knowledge Base`,
		description: siteDescription,
		locale: "en_US",
		images: [
			{
				url: "/assets/page.png",
				width: 1900,
				height: 913,
				alt: `${siteName} | Destiny 2 perk and mechanic descriptions with hidden values`,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: `${siteName} | Destiny 2 Knowledge Base`,
		description: siteDescription,
		images: ["/assets/page.png"],
	},
	robots: {
		index: true,
		follow: true,
	},
	alternates: {
		canonical: siteUrl,
	},
};

// The footer only needs the dataset's timestamp, but a failed load must not
// take the whole site down — the pages render their own error states.
async function readGeneratedAt() {
	try {
		const dataset = await loadCompendiumDataset();
		return dataset.generatedAt;
	} catch {
		return null;
	}
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const generatedAt = await readGeneratedAt();

	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
		>
			<body className="flex min-h-full flex-col">
				<div className="background">
					<div className="background-effect" />
					<div className="background-image" />
				</div>

				<NuqsAdapter>
					<SiteHeader />
					{children}
					{generatedAt ? <SiteFooter generatedAt={generatedAt} /> : null}
				</NuqsAdapter>

				<Analytics />

				<noscript>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src="https://succ.andrisborbas.com/backend/log/noscript?pid=nnP0JjPlBA7b"
						alt=""
						referrerPolicy="no-referrer-when-downgrade"
					/>
				</noscript>
			</body>
		</html>
	);
}
