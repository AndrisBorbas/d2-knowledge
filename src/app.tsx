// @refresh reload
import "./app.css";

import { MetaProvider, Title } from "@solidjs/meta";
import { cache, Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, type ParentProps, Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { type AuthSession, getSession } from "start-authjs";

import { authConfig } from "~/server/auth";

export const getSessionData = cache(async (): Promise<AuthSession | null> => {
	"use server";
	const event = getRequestEvent();
	if (!event) return null;
	return getSession(event.request, authConfig);
}, "session");

function RootLayout(props: ParentProps) {
	return (
		<MetaProvider>
			<Title>D2 Knowledge</Title>
			<Suspense>{props.children}</Suspense>
		</MetaProvider>
	);
}

export default function App() {
	return (
		<>
			<ErrorBoundary
				fallback={(err) => {
					console.log(err);
					return <div class="error">{JSON.stringify(err.stack)}</div>;
				}}
			>
				<div class="background">
					<div class="background-image" />
					<div class="background-effect" />
				</div>
				<Router root={RootLayout}>
					<FileRoutes />
				</Router>
			</ErrorBoundary>
		</>
	);
}
