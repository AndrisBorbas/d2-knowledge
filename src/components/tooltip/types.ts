import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";

export type KeywordHoverPayload = {
	keywordId: string;
	anchorRect: DOMRect;
};

export type KeywordClickPayload = {
	keywordId: string;
};

export type TooltipKeywordHoverPayload = KeywordHoverPayload & {
	entryId: string;
	entryRect: DOMRect;
};

export type TooltipKeywordClickPayload = KeywordClickPayload & {
	entryId: string;
};

export type TooltipProps = {
	entry: AnnotatedEntry;
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover?: (payload: TooltipKeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (payload: TooltipKeywordClickPayload) => void;
	onGroupClick?: (group: string) => void;
	showPinButton?: boolean;
};

export type TooltipContentProps = {
	entry: AnnotatedEntry;
	entryMap: Map<string, AnnotatedEntry>;
	keywordMap: Map<string, Keyword>;
	onKeywordHover?: (payload: KeywordHoverPayload) => void;
	onKeywordLeave?: () => void;
	onKeywordClick?: (payload: KeywordClickPayload) => void;
};
