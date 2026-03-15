import { createFileRoute } from "@tanstack/react-router";
import { AuthSsoCallback } from "~/components/auth-sso-callback";

export const Route = createFileRoute("/sign-up/sso-callback")({
	component: SignUpSsoCallbackPage,
});

function SignUpSsoCallbackPage() {
	return <AuthSsoCallback />;
}
