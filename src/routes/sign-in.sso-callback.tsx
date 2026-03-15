import { createFileRoute } from "@tanstack/react-router";
import { AuthSsoCallback } from "~/components/auth-sso-callback";

export const Route = createFileRoute("/sign-in/sso-callback")({
	component: SignInSsoCallbackPage,
});

function SignInSsoCallbackPage() {
	return <AuthSsoCallback />;
}
