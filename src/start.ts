import { createStart } from "@tanstack/react-start";
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";

export const startInstance = createStart(() => ({
	requestMiddleware: [
		clerkMiddleware({
			signInUrl: "/sign-in",
			signUpUrl: "/sign-up",
			signInFallbackRedirectUrl: "/create",
			signUpFallbackRedirectUrl: "/create",
		}),
	],
}));
