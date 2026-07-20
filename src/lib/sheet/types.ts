export type Section = {
	name: string;
	subsections?: string[];
};

export type TabRules = {
	strategy:
		| "paired-rows"
		| "same-row"
		| "set-bonus-two-rows"
		| "skip"
		| "paired-columns";
	type?: "element";
	fragmentTitlePrefix?: string;
	skipStart?: number;
	sections?: Section[];
	titleColumns?: number[];
	descriptionRowOffset?: number;
	maxTitleLength?: number;
	minDescriptionLength?: number;
	dynamicSection?: {
		maxLength?: number;
		minLength?: number;
		forbidSentenceEnding?: boolean;
	};
};
