import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { useUser, UserButton } from "@clerk/tanstack-react-start";
import { Button } from "~/components/ui/button";

function AuthButtons() {
	const { isSignedIn, isLoaded } = useUser();

	if (!isLoaded) {
		return null;
	}

	if (isSignedIn) {
		return <UserButton />;
	}

	return (
		<>
			<Button asChild variant="ghost" className="hidden rounded-full md:inline-flex">
				<Link to="/sign-in">Masuk</Link>
			</Button>
			<Button
				asChild
				className="rounded-full bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
			>
				<Link to="/sign-up">Mulai Gratis</Link>
			</Button>
		</>
	);
}

function DesktopNav() {
	const { isSignedIn, isLoaded } = useUser();

	return (
		<nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
			<Link to="/" className="transition hover:text-slate-900">
				Beranda
			</Link>
			<Link to="/create" className="transition hover:text-slate-900">
				Buat Cerita
			</Link>
			{isLoaded && isSignedIn ? (
				<Link to="/my-library" search={{ page: 1 }} className="transition hover:text-slate-900">
					Cerita Saya
				</Link>
			) : null}
			<Link
				to="/library"
				search={{ sort: "newest", page: 1 }}
				className="transition hover:text-slate-900"
			>
				Pustaka Publik
			</Link>
		</nav>
	);
}

export function SiteShell({ children }: { children: ReactNode }) {
	return (
		<div className="site-shell relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,222,196,0.75),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(196,237,255,0.7),_transparent_30%),linear-gradient(180deg,_#fffaf4_0%,_#fff8ef_38%,_#fffdf9_100%)] text-slate-900">
			<div className="site-shell-grid pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
			<div className="relative mx-auto flex min-h-screen w-full flex-col">
				<header className="site-shell-header sticky top-0 z-20 -mx-4 border-b border-white/40 bg-white/55 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
					<div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
						<div className="w-1/3">
							<Link to="/" className="flex items-center gap-3 text-left">
								<div className="flex size-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
									<Sparkles className="size-5" />
								</div>
								<div>
									<p className="font-heading text-lg leading-none">Alkisah</p>
								</div>
							</Link>
						</div>
						<div className="w-1/3 flex items-center justify-center">
							<DesktopNav />
						</div>
						<div className="w-1/3 flex items-center justify-end gap-3">
							<AuthButtons />
						</div>
					</div>
				</header>
				<main className="flex-1 py-10 sm:py-14 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
					{children}
				</main>
				<footer className="site-shell-footer max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 border-t border-white/40 py-8 text-sm text-slate-500">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<p>
							Magical bedtime stories for Indonesian families, backed by Cloudflare edge delivery.
						</p>
						<p>&copy; {new Date().getFullYear()} Automagic Systems.</p>
					</div>
				</footer>
			</div>
		</div>
	);
}
