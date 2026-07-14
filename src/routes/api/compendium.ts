import { buildCompendiumDataset } from "~/lib/sheet/compendium";

export const GET = async () => {
	try {
		const dataset = await buildCompendiumDataset();
		return new Response(JSON.stringify(dataset), {
			status: 200,
			headers: {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store",
			},
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		return new Response(JSON.stringify({ error: message }), {
			status: 500,
			headers: {
				"content-type": "application/json; charset=utf-8",
			},
		});
	}
};
