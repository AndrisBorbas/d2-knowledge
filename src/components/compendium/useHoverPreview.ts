"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { AnnotatedEntry, Keyword } from "@/lib/compendium/model";

import { clamp } from "./helpers";

const HOVER_CARD_MARGIN = 12;
const HOVER_CARD_OFFSET = 10;

export type HoverPreviewState = {
	entryId: string;
	placement: "left" | "right";
	anchor: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};
};

export function useHoverPreview(params: {
	keywordMap: Map<string, Keyword>;
	entryMap: Map<string, AnnotatedEntry>;
}) {
	const { keywordMap, entryMap } = params;
	const [hoverPreview, setHoverPreview] = useState<HoverPreviewState | null>(
		null,
	);
	const hoverCardRef = useRef<HTMLDivElement>(null);
	const [resolvedHoverTop, setResolvedHoverTop] = useState<number | null>(null);

	const hoveredEntry = hoverPreview
		? (entryMap.get(hoverPreview.entryId) ?? null)
		: null;

	const hoverCardStyle = useMemo(() => {
		if (!hoverPreview || typeof window === "undefined") {
			return null;
		}

		const centerY =
			hoverPreview.anchor.top +
			(hoverPreview.anchor.bottom - hoverPreview.anchor.top) / 2;
		const top = clamp(
			centerY,
			HOVER_CARD_MARGIN,
			window.innerHeight - HOVER_CARD_MARGIN,
		);
		const left =
			hoverPreview.placement === "right"
				? hoverPreview.anchor.right + HOVER_CARD_OFFSET
				: hoverPreview.anchor.left - HOVER_CARD_OFFSET;

		return {
			left,
			top,
		};
	}, [hoverPreview]);

	useLayoutEffect(() => {
		if (!hoverPreview || !hoverCardStyle || !hoverCardRef.current) {
			setResolvedHoverTop(null);
			return;
		}

		const height = hoverCardRef.current.offsetHeight;
		const centerY =
			hoverPreview.anchor.top +
			(hoverPreview.anchor.bottom - hoverPreview.anchor.top) / 2;
		const maxTop = Math.max(
			HOVER_CARD_MARGIN,
			window.innerHeight - height - HOVER_CARD_MARGIN,
		);
		const nextTop = clamp(centerY - height / 2, HOVER_CARD_MARGIN, maxTop);

		setResolvedHoverTop((current) => (current === nextTop ? current : nextTop));
	}, [hoverPreview, hoverCardStyle]);

	useEffect(() => {
		if (!hoverPreview) {
			return;
		}

		const hidePreview = () => {
			setHoverPreview(null);
		};

		window.addEventListener("scroll", hidePreview, true);
		window.addEventListener("resize", hidePreview);

		return () => {
			window.removeEventListener("scroll", hidePreview, true);
			window.removeEventListener("resize", hidePreview);
		};
	}, [hoverPreview]);

	// Anchor a preview to an arbitrary element without going through a keyword —
	// used by the artifact grid, where the icon *is* the entry.
	const showEntryPreview = (entryId: string, anchorRect: DOMRect) => {
		if (!entryMap.has(entryId)) return;

		const placement: HoverPreviewState["placement"] =
			anchorRect.left > window.innerWidth - anchorRect.right ? "left" : "right";

		setHoverPreview({
			entryId,
			placement,
			anchor: {
				top: anchorRect.top,
				bottom: anchorRect.bottom,
				left: anchorRect.left,
				right: anchorRect.right,
			},
		});
	};

	const handleKeywordHover = ({
		keywordId,
		entryId,
		entryRect,
	}: {
		keywordId: string;
		entryId: string;
		entryRect: DOMRect;
	}) => {
		const referencedEntryId = keywordMap
			.get(keywordId)
			?.references.find((candidateId) => entryMap.has(candidateId));
		const targetEntryId = referencedEntryId ?? entryId;

		showEntryPreview(targetEntryId, entryRect);
	};

	const handleKeywordLeave = () => {
		setHoverPreview(null);
	};

	return {
		hoverPreview,
		hoverCardRef,
		resolvedHoverTop,
		hoverCardStyle,
		hoveredEntry,
		showEntryPreview,
		handleKeywordHover,
		handleKeywordLeave,
	};
}
