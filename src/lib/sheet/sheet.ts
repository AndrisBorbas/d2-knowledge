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

function fetchSheetTab(sheet: string, tab: string) {
	const url = `https://docs.google.com/spreadsheets/d/${sheet}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;

	return fetch(url, {
		headers: {
			accept: "text/csv,text/plain,*/*",
		},
		signal: AbortSignal.timeout(15000),
	}).then(async (res) => {
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}
		const text = await res.text();
		return parseCSV(text);
	});
}

export function fetchSheetTabs(sheet: string, tabs: string[]) {
	return Promise.all(tabs.map((tab) => fetchSheetTab(sheet, tab))).then(
		(results) => {
			const data: Record<string, string[][]> = {};
			for (let i = 0; i < tabs.length; i++) {
				data[tabs[i]] = results[i];
			}
			return data;
		},
	);
}
