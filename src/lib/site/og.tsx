import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { SITE_HOST, SITE_NAME } from "@/lib/site/meta";

// The size every crawler expects for a large summary card, and what Discord
// renders the link preview at. `buildPageMetadata` repeats it in og:image:width
// and og:image:height, so the two have to stay in step.
export const OG_SIZE = { width: 1200, height: 630 };

const ASSETS_DIR = join(process.cwd(), "public", "assets");

// Read once per build instead of once per image: every route's card pulls the
// same background, mark and font, and `next build` renders all of them in the
// same process.
const [displayFont, backgroundImage, markImage] = await Promise.all([
	readFile(join(ASSETS_DIR, "fonts", "NHaasGroteskDSPro-55Rg.ttf")),
	readFile(join(ASSETS_DIR, "images", "fanaly.jpg")),
	readFile(join(ASSETS_DIR, "icons", "owlsector_small.svg")),
]);

// Satori has no network and no bundler, so both images have to travel inline.
const backgroundSrc = `data:image/jpeg;base64,${backgroundImage.toString("base64")}`;
const markSrc = `data:image/svg+xml;base64,${markImage.toString("base64")}`;

const DISPLAY_FONT = "Neue Haas Grotesk";

// The masterwork yellow the site leads with, plus the element colours, so a
// subclass card reads as that element before the title is read.
export const OG_ACCENTS = {
	default: "#fdc700",
	arc: "#7aecf3",
	solar: "#f0631e",
	void: "#b185df",
	stasis: "#4d88ff",
	strand: "#35e366",
	prismatic: "#ef639f",
} as const;

export type OgStat = { label: string; value: string };

type OgImageInput = {
	/** Small line above the title, e.g. the section a subpage belongs to. */
	eyebrow: string;
	title: string;
	description: string;
	/** Path the card belongs to, printed bottom right as `owlsector.net/...`. */
	path: string;
	accent?: string;
	stats?: OgStat[];
	/** Data URI for a subject icon, drawn large on the right. */
	icon?: string | null;
};

/** `#rrggbb` to `rgba(r, g, b, alpha)`, which is what satori's glows need. */
function withAlpha(hex: string, alpha: number) {
	const value = Number.parseInt(hex.slice(1), 16);
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Satori has no line clamp, so an over-long description has to be cut before it
// is laid out or it pushes the stats off the card.
function clamp(text: string, limit: number) {
	const normalized = text.replace(/\s+/gu, " ").trim();
	if (normalized.length <= limit) return normalized;

	const cut = normalized.slice(0, limit);
	const lastSpace = cut.lastIndexOf(" ");
	return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/u, "")}...`;
}

/**
 * Satori has no network of its own, so a remote icon has to be downloaded and
 * inlined here. A miss is not worth failing a build over - the card just drops
 * the icon.
 */
export async function fetchImageDataUri(url: string) {
	try {
		const response = await fetch(url);
		if (!response.ok) return null;

		const contentType = response.headers.get("content-type") ?? "image/png";
		const body = Buffer.from(await response.arrayBuffer());
		return `data:${contentType};base64,${body.toString("base64")}`;
	} catch {
		return null;
	}
}

export function renderOgImage({
	eyebrow,
	title,
	description,
	path,
	accent = OG_ACCENTS.default,
	stats = [],
	icon = null,
}: OgImageInput) {
	return new ImageResponse(
		<div
			style={{
				position: "relative",
				display: "flex",
				width: "100%",
				height: "100%",
				backgroundColor: "#0a0b12",
				color: "#ffffff",
				fontFamily: DISPLAY_FONT,
			}}
		>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={backgroundSrc}
				alt=""
				width={OG_SIZE.width}
				height={OG_SIZE.height}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: OG_SIZE.width,
					height: OG_SIZE.height,
					objectFit: "cover",
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					display: "flex",
					width: OG_SIZE.width,
					height: OG_SIZE.height,
					backgroundImage:
						"linear-gradient(100deg, rgba(8,9,16,0.94) 20%, rgba(8,9,16,0.7) 58%, rgba(8,9,16,0.34) 100%)",
				}}
			/>

			{icon ? (
				/* eslint-disable-next-line @next/next/no-img-element */
				<img
					src={icon}
					alt=""
					width={340}
					height={340}
					style={{
						position: "absolute",
						top: 145,
						left: 790,
						width: 340,
						height: 340,
					}}
				/>
			) : null}

			<div
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					width: "100%",
					height: "100%",
					padding: "56px 64px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={markSrc} alt="" width={64} height={62} />
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 4,
						}}
					>
						<span
							style={{
								fontSize: 30,
								fontWeight: 700,
								color: OG_ACCENTS.default,
								textShadow: `0 0 18px ${withAlpha(OG_ACCENTS.default, 0.55)}`,
							}}
						>
							{SITE_NAME}
						</span>
						<span
							style={{
								fontSize: 18,
								letterSpacing: 6,
								textTransform: "uppercase",
								color: "rgba(255,255,255,0.55)",
							}}
						>
							{eyebrow}
						</span>
					</div>
				</div>

				<div style={{ display: "flex", gap: 28 }}>
					<div
						style={{
							display: "flex",
							width: 8,
							backgroundColor: accent,
							boxShadow: `0 0 28px ${withAlpha(accent, 0.7)}`,
						}}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 20,
							maxWidth: icon ? 680 : 940,
						}}
					>
						<span
							style={{
								fontSize: title.length > 26 ? 70 : 84,
								fontWeight: 700,
								lineHeight: 1.05,
								textTransform: "uppercase",
								textShadow: `0 0 30px ${withAlpha(accent, 0.35)}`,
							}}
						>
							{title}
						</span>
						<span
							style={{
								fontSize: 30,
								lineHeight: 1.45,
								color: "rgba(255,255,255,0.75)",
							}}
						>
							{clamp(description, 165)}
						</span>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "flex-end",
						justifyContent: "space-between",
					}}
				>
					<div style={{ display: "flex", gap: 14 }}>
						{stats.map((stat) => (
							<div
								key={stat.label}
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 6,
									padding: "12px 20px",
									border: "1px solid rgba(255,255,255,0.16)",
									backgroundColor: "rgba(255,255,255,0.06)",
								}}
							>
								<span
									style={{
										fontSize: 15,
										letterSpacing: 3,
										textTransform: "uppercase",
										color: "rgba(255,255,255,0.5)",
									}}
								>
									{stat.label}
								</span>
								<span style={{ fontSize: 28, fontWeight: 700 }}>
									{stat.value}
								</span>
							</div>
						))}
					</div>

					<span
						style={{
							fontSize: 24,
							color: "rgba(255,255,255,0.6)",
						}}
					>
						{`${SITE_HOST}${path === "/" ? "" : path}`}
					</span>
				</div>
			</div>
		</div>,
		{
			...OG_SIZE,
			fonts: [
				{
					name: DISPLAY_FONT,
					data: displayFont,
					weight: 400,
					style: "normal",
				},
				{
					name: DISPLAY_FONT,
					data: displayFont,
					weight: 700,
					style: "normal",
				},
			],
		},
	);
}
