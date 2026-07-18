function parseCSV(rawText: string) {
	const text = rawText.replace(/\r\n|\r/g, "\n");
	const rows = [];
	let row = [],
		field = "",
		inQ = false;
	for (let i = 0; i < text.length; i++) {
		const c = text[i],
			nx = text[i + 1];
		if (inQ) {
			if (c === '"' && nx === '"') {
				field += '"';
				i++;
			} else if (c === '"') inQ = false;
			else field += c;
		} else {
			if (c === '"') inQ = true;
			else if (c === ",") {
				row.push(field);
				field = "";
			} else if (c === "\n") {
				row.push(field);
				rows.push(row);
				row = [];
				field = "";
			} else field += c;
		}
	}
	if (row.length || field) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

async function fetchSheetTab(sheet: string, tab: string) {
	const url = `https://docs.google.com/spreadsheets/d/${sheet}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

	const res = await fetch(url, {
		headers: {
			accept: "text/csv,text/plain,*/*",
		},
		signal: AbortSignal.timeout(15000),
	});
	if (!res.ok) {
		throw new Error(`HTTP ${res.status}`);
	}
	return await parseCSV(await res.text());
}

export async function fetchSheetTabs(sheet: string, tabs: string[]) {
	const results = await Promise.all(
		tabs.map((tab) => fetchSheetTab(sheet, tab)),
	);
	const data: Record<string, string[][]> = {};
	for (let i = 0; i < tabs.length; i++) {
		data[tabs[i]] = results[i];
	}
	return data;
}
