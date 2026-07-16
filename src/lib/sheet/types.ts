export type Section = {
	name: string;
	subsections?: string[];
};

export type TabRules = {
	strategy: "paired-rows" | "same-row" | "set-bonus-two-rows" | "skip";
	type?: "element";
	skipStart?: number;
	sections?: Section[];
};
