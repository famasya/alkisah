import { createFileRoute, Link } from "@tanstack/react-router";
import { LibraryBig } from "lucide-react";
import { LibraryCard } from "~/components/library-card";
import { Button } from "~/components/ui/button";
import { listPublicStoriesFn } from "~/features/stories/story.functions";
import { libraryQuerySchema } from "~/features/stories/story.schemas";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/library")({
	validateSearch: (search) => libraryQuerySchema.parse(search),
	loaderDeps: ({ search }) => search,
	head: () => ({
		meta: seo({
			title: "Public Library | Alkisah",
			description: "Jelajahi cerita publik yang sudah di-share oleh keluarga lain di Alkisah.",
		}),
	}),
	loader: ({ deps }) => listPublicStoriesFn({ data: deps }),
	component: LibraryPage,
});

function LibraryPage() {
	const stories = Route.useLoaderData();
	const search = Route.useSearch();

	return (
		<div className="space-y-8">
			<section className="flex flex-col gap-5 rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)] lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-3">
					<div className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
						<LibraryBig className="mr-2 size-4" />
						Public Library
					</div>
					<p className="font-heading text-4xl text-slate-900">Pustaka Cerita Anak Indonesia</p>
					<p className="max-w-2xl text-sm leading-7 text-slate-600">
						Semua cerita di sini sudah dibuka versi premium dan dipilih untuk tampil publik oleh
						pemiliknya.
					</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button
						asChild
						variant={search.sort === "newest" ? "default" : "outline"}
						className="rounded-full"
					>
						<Link to="/library" search={{ sort: "newest", page: 1 }}>
							Terbaru
						</Link>
					</Button>
					<Button
						asChild
						variant={search.sort === "popular" ? "default" : "outline"}
						className="rounded-full"
					>
						<Link to="/library" search={{ sort: "popular", page: 1 }}>
							Paling Populer
						</Link>
					</Button>
				</div>
			</section>

			<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
				{stories.items.map((story) => (
					<LibraryCard key={story.id} story={story} />
				))}
			</section>

			<div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
				<p className="text-sm text-slate-500">
					Halaman {stories.page} • {stories.totalItems} cerita
				</p>
				<div className="flex items-center gap-3">
					{stories.page <= 1 ? (
						<Button variant="outline" className="rounded-full" disabled>
							Sebelumnya
						</Button>
					) : (
						<Button asChild variant="outline" className="rounded-full">
							<Link
								to="/library"
								search={{ sort: stories.sort, page: Math.max(1, stories.page - 1) }}
							>
								Sebelumnya
							</Link>
						</Button>
					)}
					{stories.hasNextPage ? (
						<Button asChild variant="outline" className="rounded-full">
							<Link to="/library" search={{ sort: stories.sort, page: stories.page + 1 }}>
								Berikutnya
							</Link>
						</Button>
					) : (
						<Button variant="outline" className="rounded-full" disabled>
							Berikutnya
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
