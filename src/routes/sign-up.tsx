import { SignUp } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";
import { shadcn } from "@clerk/themes";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/sign-up")({
	head: () => ({
		meta: seo({
			title: "Daftar | Alkisah",
			description:
				"Buat akun untuk menyimpan cerita, memakai kuota gratis, dan membuka cerita premium.",
		}),
	}),
	component: SignUpPage,
});

function SignUpPage() {
	return (
		<div className="flex min-h-[70vh] items-center justify-center">
			<SignUp
				routing="path"
				path="/sign-up"
				signInUrl="/sign-in"
				fallbackRedirectUrl="/create"
				appearance={{ baseTheme: shadcn }}
			/>
		</div>
	);
}
