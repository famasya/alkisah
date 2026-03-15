import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { shadcn } from "@clerk/themes";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/sign-in")({
	head: () => ({
		meta: seo({
			title: "Masuk | Alkisah",
			description: "Masuk untuk mulai membuat cerita dan melacak kuota gratis harianmu.",
		}),
	}),
	component: SignInPage,
});

function SignInPage() {
	return (
		<div className="flex min-h-[70vh] items-center justify-center">
			<SignIn
				routing="path"
				path="/sign-in"
				signUpUrl="/sign-up"
				fallbackRedirectUrl="/create"
				appearance={{ baseTheme: shadcn }}
			/>
		</div>
	);
}
