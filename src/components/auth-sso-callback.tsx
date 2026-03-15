import { HandleSSOCallback } from "@clerk/tanstack-react-start";

function redirect(url: string) {
	if (typeof window !== "undefined") {
		window.location.assign(url);
	}
}

export function AuthSsoCallback() {
	return (
		<div className="flex min-h-[70vh] items-center justify-center px-6 text-center">
			<div className="max-w-sm space-y-2">
				<p className="text-lg font-semibold text-slate-900">Menyelesaikan login...</p>
				<p className="text-sm text-slate-600">
					Mohon tunggu sebentar saat kami menyambungkan akunmu.
				</p>
				<HandleSSOCallback
					navigateToApp={({ decorateUrl }) => {
						redirect(decorateUrl("/create"));
					}}
					navigateToSignIn={() => {
						redirect("/sign-in");
					}}
					navigateToSignUp={() => {
						redirect("/sign-up");
					}}
				/>
			</div>
		</div>
	);
}
