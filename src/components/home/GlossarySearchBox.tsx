"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GlossarySearchBox() {
	const router = useRouter();
	const [value, setValue] = useState("");

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				const query = value.trim();
				router.push(
					query.length > 0
						? `/glossary?q=${encodeURIComponent(query)}`
						: "/glossary",
				);
			}}
			className="flex gap-3"
		>
			<input
				type="search"
				value={value}
				onChange={(event) => setValue(event.target.value)}
				placeholder="Search by title, description, item, or hash..."
				aria-label="Search the glossary"
				className="w-full border border-blue-500/50 bg-blue-950/50 px-4 py-2.5 text-sm text-white placeholder:text-white/65 focus:border-sky-300/60 focus:outline-none"
			/>
			<button
				type="submit"
				className="borderHover bg-white/8 px-4 py-2.5 text-xs font-semibold tracking-[0.12em] text-white/75 uppercase transition hover:bg-white/14"
			>
				Search
			</button>
		</form>
	);
}
