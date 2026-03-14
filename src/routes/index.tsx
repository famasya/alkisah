import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/")({
	loader: () => getData(),
	component: Home,
});

const getData = createServerFn().handler(() => {
	return {
		message: `Running in ${navigator.userAgent}`,
		myVar: env.MY_VAR,
	};
});

function Home() {
	const data = Route.useLoaderData();

	return (
		<div className="flex flex-col gap-2 h-screen w-full items-center justify-center">
			<Button>Click Me</Button>
			<p>{data.message}</p>
			<p>{data.myVar}</p>
		</div>
	);
}
