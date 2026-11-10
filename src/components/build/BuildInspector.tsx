"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useMemo } from "react";

import { Button } from "@/components/ui/Button";
import { resolveBuild } from "@/lib/dim/resolve";
import { useHydrated } from "@/lib/utils/hydration";

import { BuildReport } from "./BuildReport";
import { useBuildInspectorData } from "./useBuildInspectorData";
import { useDimLoadout } from "./useDimLoadout";

const EXAMPLE_LINK = "https://dim.gg/abcdefg/my-build";

function Notice({
	tone = "info",
	children,
}: {
	tone?: "info" | "error";
	children: React.ReactNode;
}) {
	return (
		<p
			role={tone === "error" ? "alert" : "status"}
			className={
				tone === "error"
					? "border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-100/85"
					: "border border-blue-500/30 bg-blue-950/20 p-4 text-sm text-white/72"
			}
		>
			{children}
		</p>
	);
}

export function BuildInspector() {
	// The prerender has no query string, so a shared `?b=` link waits for
	// hydration before it reaches the markup - see `useHydrated`.
	const hydrated = useHydrated();
	const [urlInput, setUrlInput] = useQueryState(
		"b",
		parseAsString.withOptions({ history: "push" }),
	);
	const pastedInput = hydrated ? urlInput : null;

	const data = useBuildInspectorData();
	const { isLoading, loadout, errorMessage } = useDimLoadout(pastedInput);

	const build = useMemo(() => {
		if (!loadout || data.status !== "ready") return null;
		return resolveBuild(loadout, data.index, data.catalog);
	}, [loadout, data]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const submitted = new FormData(event.currentTarget).get("build");
		const value = typeof submitted === "string" ? submitted.trim() : "";
		void setUrlInput(value || null);
	};

	const isWorking = isLoading || (loadout && data.status === "loading");

	return (
		<div className="flex w-full flex-col gap-6 p-4 md:px-6 lg:px-8">
			{/* Keyed on the pasted text so back and forward, and a shared link, put
			    it back in the box without an effect to copy it there. */}
			<form
				key={pastedInput ?? ""}
				onSubmit={handleSubmit}
				className="flex flex-col gap-2 sm:flex-row"
			>
				<label htmlFor="build-link" className="sr-only">
					DIM build link
				</label>
				<input
					id="build-link"
					name="build"
					type="text"
					defaultValue={pastedInput ?? ""}
					placeholder={EXAMPLE_LINK}
					autoComplete="off"
					spellCheck={false}
					className="w-full border border-blue-500/50 bg-blue-950/50 px-4 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-sky-300/60 focus:outline-none"
				/>
				<Button type="submit" variant="primary" size="md">
					Inspect build
				</Button>
			</form>

			{pastedInput === null ? (
				<div className="max-w-3xl text-sm leading-6 text-white/62">
					<p>
						Use the Share button on a loadout in DIM to get a dim.gg link. The
						link is looked up from your browser straight on DIM&apos;s servers,
						so Owl Sector never sees it, and the result can be shared by copying
						this page&apos;s address.
					</p>
				</div>
			) : null}

			{errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
			{data.status === "error" ? (
				<Notice tone="error">{data.message}</Notice>
			) : null}
			{isWorking ? <Notice>Reading the build...</Notice> : null}

			{build && data.status === "ready" ? (
				<BuildReport
					build={build}
					catalog={data.catalog}
					pastedInput={pastedInput ?? ""}
				/>
			) : null}
		</div>
	);
}
