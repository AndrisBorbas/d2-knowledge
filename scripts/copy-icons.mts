import { access, copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

import {
	DESTINY_ICONS_BASE,
	STATIC_ICON_PATH_BY_GLYPH,
} from "../src/lib/bungie/glyphs";

// justrealmilk/destiny-icons is 252 files / 3.2 MB, of which this app renders
// six. The submodule is checked out under vendor/ so none of it is deployed;
// this copies the referenced icons (plus the licence they ship under) into
// public/ where the browser can reach them. The copies are gitignored.
const VENDOR_DIR = ["vendor", "destiny-icons"];
const PUBLIC_DIR = ["public", "assets", "destiny-icons"];
const EXTRA_FILES = ["LICENSE"];

function toRelativePath(url: string) {
	if (!url.startsWith(`${DESTINY_ICONS_BASE}/`)) {
		throw new Error(`Icon path is not under ${DESTINY_ICONS_BASE}: ${url}`);
	}
	return url.slice(DESTINY_ICONS_BASE.length + 1);
}

async function main() {
	const vendorRoot = path.join(process.cwd(), ...VENDOR_DIR);
	const publicRoot = path.join(process.cwd(), ...PUBLIC_DIR);

	try {
		await access(vendorRoot);
	} catch {
		// Cloned without --recursive. The icons just won't render; not worth
		// failing a build over.
		console.warn(
			`No destiny-icons checkout at ${vendorRoot}. Run: git submodule update --init`,
		);
		return;
	}

	const relativePaths = [
		...new Set(Object.values(STATIC_ICON_PATH_BY_GLYPH).map(toRelativePath)),
		...EXTRA_FILES,
	];

	for (const relativePath of relativePaths) {
		const source = path.join(vendorRoot, relativePath);
		const destination = path.join(publicRoot, relativePath);
		await mkdir(path.dirname(destination), { recursive: true });
		// Deliberately not caught: the submodule is present, so a missing file
		// means a glyph points at an icon that no longer exists upstream.
		await copyFile(source, destination);
	}

	console.log(
		`Copied ${relativePaths.length} destiny-icons into ${publicRoot}`,
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
