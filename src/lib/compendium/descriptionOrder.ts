import type { UnifiedSourceId } from "./model";

// Which description stacks on top when an entry carries several. Edit this
// file to change the order - it is deliberately not a user setting; the
// settings modal only decides which sources are visible at all.
export const DEFAULT_DESCRIPTION_ORDER: readonly UnifiedSourceId[] = [
	"bungie",
	"clarity",
	"ddc",
	"manual",
];

// Keyed on `entry.groups`. Entries carry several groups (Ascension is
// ["Arc", "Aspect", "Abilities", "Hunter"]), so the first rule that matches
// wins - keep the most specific groups at the top of the list.
export const DESCRIPTION_ORDER_BY_GROUP: readonly (readonly [
	string,
	readonly UnifiedSourceId[],
])[] = [
	["Aspect", ["bungie", "ddc", "clarity", "manual"]],
	["Fragments", ["bungie", "ddc", "clarity", "manual"]],
];

export function getDescriptionOrder(
	groups: string[],
): readonly UnifiedSourceId[] {
	for (const [group, order] of DESCRIPTION_ORDER_BY_GROUP) {
		if (groups.includes(group)) return order;
	}

	return DEFAULT_DESCRIPTION_ORDER;
}
