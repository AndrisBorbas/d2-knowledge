// Tailwind only ships the classes it can see as literal strings, so the
// element palette is spelled out here rather than built from the slug.
export const ELEMENT_TEXT_CLASS: Record<string, string> = {
	arc: "text-arc",
	solar: "text-solar",
	void: "text-void",
	stasis: "text-stasis",
	strand: "text-strand",
	prismatic: "text-prismatic",
};

export const ELEMENT_BORDER_CLASS: Record<string, string> = {
	arc: "border-arc/60",
	solar: "border-solar/60",
	void: "border-void/60",
	stasis: "border-stasis/60",
	strand: "border-strand/60",
	prismatic: "border-prismatic/60",
};

export const ELEMENT_ACTIVE_CLASS: Record<string, string> = {
	arc: "bg-arc/25 text-arc",
	solar: "bg-solar/25 text-solar",
	void: "bg-void/25 text-void",
	stasis: "bg-stasis/25 text-stasis",
	strand: "bg-strand/25 text-strand",
	prismatic: "bg-prismatic/25 text-prismatic",
};
