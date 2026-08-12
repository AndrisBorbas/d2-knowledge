import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Analytics } from "@/components/Analytics";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const siteUrl = "https://owlsector.net";
const siteName = "Owl Sector";
const siteDescription =
	"The unofficial Destiny 2 knowledge base — hidden numbers, undocumented mechanics, and unexplained interactions dug out of the game and cross-referenced with the community compendium.";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: `${siteName} — Destiny 2 Knowledge Base`,
		template: `%s — ${siteName}`,
	},
	description: siteDescription,
	applicationName: siteName,
	keywords: [
		"Destiny 2",
		"Destiny 2 wiki",
		"Destiny 2 database",
		"Destiny 2 mechanics",
		"Destiny 2 hidden mechanics",
		"Destiny 2 compendium",
		"Destiny 2 Clarity",
		"weapon perks",
		"armor mods",
		"Bungie API",
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
		title: `${siteName} — Destiny 2 Knowledge Base`,
		description: siteDescription,
		locale: "en_US",
		images: [
			{
				url: "/assets/page.png",
				width: 1900,
				height: 913,
				alt: `${siteName} — Destiny 2 perk and mechanic descriptions with hidden values`,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: `${siteName} — Destiny 2 Knowledge Base`,
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
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

				<NuqsAdapter>{children}</NuqsAdapter>

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
