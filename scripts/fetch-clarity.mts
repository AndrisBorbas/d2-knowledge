import { writeFile } from "node:fs/promises";
import path from "node:path";

// Upstream still calls the file foundry.json - that is Clarity's own naming,
// not ours, so the remote path stays as-is while the local copy is clarity.json.
const CLARITY_URL =
	"https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/live/descriptions/foundry.json";

async function main() {
	const response = await fetch(CLARITY_URL);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch Clarity descriptions: ${response.status} ${response.statusText}`,
		);
	}

	const payload: unknown = await response.json();
	const outputPath = path.join(process.cwd(), "data", "clarity.json");
	await writeFile(outputPath, JSON.stringify(payload, null, "\t"), "utf8");

	console.log(`Wrote Clarity data: ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
