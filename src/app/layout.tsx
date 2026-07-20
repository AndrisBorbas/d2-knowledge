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

export const metadata: Metadata = {
	title: "D2 Knowledge",
	description: "Destiny 2 Knowledge Base",
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
