type JsonLdProps = {
	data: Record<string, unknown>;
};

// Escaping `<` keeps a stray `</script>` in any string from closing the tag
// early; JSON parsers read `<` back as the same character.
export function JsonLd({ data }: JsonLdProps) {
	return (
		<script
			type="application/ld+json"
			dangerouslySetInnerHTML={{
				__html: JSON.stringify(data).replace(/</gu, "\\u003c"),
			}}
		/>
	);
}
