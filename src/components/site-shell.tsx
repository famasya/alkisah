import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Sparkles, Menu, X } from "lucide-react";
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

function Navigation() {
	const { isSignedIn, isLoaded } = useUser();
	const [isOpen, setIsOpen] = useState(false);

	const navLinks = [
		{ to: "/", label: "Beranda" },
		{ to: "/methodology", label: "Metodologi" },
		{ to: "/create", label: "Buat Cerita" },
		{ to: "/library", label: "Pustaka Publik" },
		...(isLoaded && isSignedIn ? [{ to: "/my-library", label: "Cerita Saya" }] : []),
	] as const;

	return (
		<>
			<nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
				<Link to="/" className="transition hover:text-slate-900">
					Beranda
				</Link>
				<Link to="/methodology" className="transition hover:text-slate-900">
					Metodologi
				</Link>
				<Link to="/create" className="transition hover:text-slate-900">
					Buat Cerita
				</Link>
				<Link
					to="/library"
					search={{ sort: "newest", page: 1 }}
					className="transition hover:text-slate-900"
				>
					Pustaka Publik
				</Link>
				{isLoaded && isSignedIn ? (
					<Link to="/my-library" search={{ page: 1 }} className="transition hover:text-slate-900">
						Cerita Saya
					</Link>
				) : null}
			</nav>

			<div className="md:hidden">
				<Button
					variant="outline"
					onClick={() => setIsOpen(!isOpen)}
					aria-label={isOpen ? "Tutup menu" : "Buka menu"}
				>
					{isOpen ? <X className="size-5" /> : <Menu className="size-5" />} Navigasi
				</Button>

				{isOpen && (
					<div className="absolute left-0 right-0 top-full z-50 border-b border-white/40 bg-white/95 px-4 py-4 shadow-lg backdrop-blur-xl">
						<nav className="flex flex-col gap-2 text-sm font-medium text-slate-600">
							{navLinks.map((link) => (
								<Link
									key={link.to}
									to={link.to}
									search={
										link.to === "/library"
											? { sort: "newest" as const, page: 1 }
											: link.to === "/my-library"
												? { page: 1 }
												: undefined
									}
									className="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
									onClick={() => setIsOpen(false)}
								>
									{link.label}
								</Link>
							))}
						</nav>
					</div>
				)}
			</div>
		</>
	);
}

export function SiteShell({ children }: { children: ReactNode }) {
	return (
		<div className="site-shell relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,222,196,0.75),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(196,237,255,0.7),_transparent_30%),linear-gradient(180deg,_#fffaf4_0%,_#fff8ef_38%,_#fffdf9_100%)] text-slate-900">
			<div className="site-shell-grid pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
			<div className="relative mx-auto flex min-h-screen w-full flex-col">
				<header className="site-shell-header sticky top-0 z-20 border-b border-white/40 bg-white/55 px-4 py-4 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
					<div className="mx-auto px-8 flex max-w-7xl items-center justify-between gap-4">
						<div>
							<Link to="/" className="flex items-center gap-3 text-left">
								<div className="flex size-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
									<Sparkles className="size-5" />
								</div>
							</Link>
						</div>
						<div className="flex items-center justify-center">
							<Navigation />
						</div>
						<div className="flex items-center justify-end gap-3">
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
