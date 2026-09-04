import type { ReactNode } from "react";

// The changelog only ever needs code, links and emphasis, so it is cheaper to
// tokenize those here than to pull a markdown renderer into the bundle. The
// underscore form is there because prettier rewrites *italic* to _italic_; the
// word-boundary guards keep it off snake_case identifiers.
type InlineMarkdownProps = {
	text: string;
};

export function InlineMarkdown({ text }: InlineMarkdownProps) {
	// Built per call rather than hoisted: a /g regex carries mutable `lastIndex`
	// state, so a shared one would leak between renders.
	const inline =
		/`([^`]+)`|\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|(?<!\w)_([^_]+)_(?!\w)/g;

	const nodes: ReactNode[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(inline)) {
		if (match.index > lastIndex) {
			nodes.push(text.slice(lastIndex, match.index));
		}

		const [, code, linkText, href, bold, starItalic, underscoreItalic] = match;
		const italic = starItalic ?? underscoreItalic;
		const key = `${match.index}`;

		if (code !== undefined) {
			nodes.push(
				<code
					key={key}
					className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] text-white/85"
				>
					{code}
				</code>,
			);
		} else if (linkText !== undefined) {
			const isExternal = /^https?:\/\//.test(href);
			nodes.push(
				<a
					key={key}
					href={href}
					target={isExternal ? "_blank" : undefined}
					rel={isExternal ? "noopener noreferrer" : undefined}
					className="decoration-masterwork/90 hover:text-masterwork text-white underline underline-offset-2 transition-all hover:underline-offset-4"
				>
					{linkText}
				</a>,
			);
		} else if (bold !== undefined) {
			nodes.push(
				<strong key={key} className="font-semibold text-white">
					{bold}
				</strong>,
			);
		} else {
			nodes.push(
				<em key={key} className="italic">
					{italic}
				</em>,
			);
		}

		lastIndex = match.index + match[0].length;
	}

	nodes.push(text.slice(lastIndex));

	return <>{nodes}</>;
}
