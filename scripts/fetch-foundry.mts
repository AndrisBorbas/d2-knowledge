import { writeFile } from "node:fs/promises";
import path from "node:path";

const FOUNDRY_URL =
	"https://raw.githubusercontent.com/Database-Clarity/Live-Clarity-Database/live/descriptions/foundry.json";

async function main() {
	const response = await fetch(FOUNDRY_URL);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch foundry.json: ${response.status} ${response.statusText}`,
		);
	}

	const payload: unknown = await response.json();
	const outputPath = path.join(
		process.cwd(),
		"public",
		"assets",
		"data",
		"foundry.json",
	);
	await writeFile(outputPath, JSON.stringify(payload, null, "\t"), "utf8");

	console.log(`Wrote foundry data: ${outputPath}`);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
