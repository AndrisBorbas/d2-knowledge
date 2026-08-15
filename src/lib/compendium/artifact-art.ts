import { readdir } from "node:fs/promises";
import path from "node:path";

const ARTIFACT_ART_DIR = ["public", "assets", "images", "artifacts"];
const ARTIFACT_ART_PUBLIC_PATH = "/assets/images/artifacts";
const SUPPORTED_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".webp",
	".avif",
]);

// The big in-game artifact graphics aren't exposed by the Bungie API, so they
// are dropped into public/assets/images/artifacts/<slug>.<ext> by hand.
// Missing art is expected — the showcase falls back to a placeholder.
let cachedArtMap: Promise<Map<string, string>> | null = null;

async function readArtifactArtMap() {
	const directory = path.join(process.cwd(), ...ARTIFACT_ART_DIR);
	const artBySlug = new Map<string, string>();

	let fileNames: string[];
	try {
		fileNames = await readdir(directory);
	} catch {
		return artBySlug;
	}

	for (const fileName of fileNames) {
		const extension = path.extname(fileName).toLowerCase();
		if (!SUPPORTED_EXTENSIONS.has(extension)) continue;
		const slug = path.basename(fileName, extension).toLowerCase();
		if (artBySlug.has(slug)) continue;
		artBySlug.set(slug, `${ARTIFACT_ART_PUBLIC_PATH}/${fileName}`);
	}

	return artBySlug;
}

export function loadArtifactArtMap() {
	cachedArtMap ??= readArtifactArtMap().catch((error: unknown) => {
		cachedArtMap = null;
		throw error;
	});
	return cachedArtMap;
}
