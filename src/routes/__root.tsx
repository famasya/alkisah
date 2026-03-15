/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/tanstack-react-start";
import { shadcn } from "@clerk/themes";
import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type * as React from "react";
import { Toaster } from "react-hot-toast";
import { SiteShell } from "~/components/site-shell";
import { DefaultCatchBoundary } from "~/components/default-catch-bounday";
import { NotFound } from "~/components/not-found";
import appCss from "~/styles/app.css?url";
import { seo } from "~/utils/seo";

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient;
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			...seo({
				title: "Alkisah | Cerita Anak Personal dengan Audio AI",
				description:
					"Buat cerita anak personal dalam 10 detik, buka audio premium dengan sekali bayar, dan bagikan ke perpustakaan cerita publik.",
			}),
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "manifest", href: "/site.webmanifest", color: "#fff8ef" },
		],
	}),
	errorComponent: DefaultCatchBoundary,
	notFoundComponent: () => <NotFound />,
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="id">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-screen w-full">
				<ClerkProvider appearance={{ baseTheme: shadcn }}>
					<SiteShell>{children}</SiteShell>
					<Toaster
						position="top-right"
						toastOptions={{
							style: {
								background: "#0f172a",
								color: "#fff",
								borderRadius: "18px",
							},
						}}
					/>
					<TanStackRouterDevtools position="bottom-right" />
					<Scripts />
				</ClerkProvider>
			</body>
		</html>
	);
}
