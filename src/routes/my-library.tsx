import { createFileRoute, Link } from "@tanstack/react-router";
import { BookLock, LibraryBig } from "lucide-react";
import { PrivateLibraryCard } from "~/components/private-library-card";
import { Button } from "~/components/ui/button";
import { listPrivateStoriesFn } from "~/features/stories/story.functions";
import { privateLibraryQuerySchema } from "~/features/stories/story.schemas";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/my-library")({
	validateSearch: (search) => privateLibraryQuerySchema.parse(search),
	loaderDeps: ({ search }) => search,
	staleTime: 0,
	preloadStaleTime: 0,
	head: () => ({
		meta: seo({
			title: "Cerita Saya | Alkisah",
			description:
				"Lihat semua cerita premium milikmu, baik yang private maupun yang sudah kamu bagikan.",
		}),
	}),
	loader: ({ deps }) => listPrivateStoriesFn({ data: deps }),
	component: MyLibraryPage,
});

function MyLibraryPage() {
	const stories = Route.useLoaderData();

	return (
		<div className="space-y-8">
			<section className="flex flex-col gap-5 rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)] lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-3">
					<div className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
						<BookLock className="mr-2 size-4" />
						Cerita Saya
					</div>
					<p className="font-heading text-4xl text-slate-900">Library milikmu</p>
					<p className="max-w-2xl text-sm leading-7 text-slate-600">
						Semua cerita premium yang sudah kamu unlock muncul di sini, baik yang masih private
						maupun yang sudah kamu bagikan ke publik. Badge pada setiap kartu menandai status
						visibilitasnya.
					</p>
				</div>
				<Button asChild variant="outline" className="rounded-full">
					<Link to="/library" search={{ sort: "newest", page: 1 }}>
						<LibraryBig className="size-4" />
						Lihat Library Publik
					</Link>
				</Button>
			</section>

			{stories.items.length > 0 ? (
				<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{stories.items.map((story) => (
						<PrivateLibraryCard key={story.id} story={story} />
					))}
				</section>
			) : (
				<section className="rounded-[28px] border border-white/70 bg-white/80 px-6 py-10 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
					<p className="font-heading text-3xl text-slate-900">Belum ada cerita premium milikmu.</p>
					<p className="mt-3 text-sm leading-7 text-slate-600">
						Buat cerita baru atau unlock cerita yang kamu suka. Setelah paid, ceritanya akan muncul
						di sini, dan kamu bisa memilih untuk membiarkannya private atau membagikannya ke publik.
					</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
						<Button asChild className="rounded-full bg-slate-900 text-white">
							<Link to="/create">Buat Cerita Baru</Link>
						</Button>
						<Button asChild variant="outline" className="rounded-full">
							<Link to="/library" search={{ sort: "newest", page: 1 }}>
								Lihat Library Publik
							</Link>
						</Button>
					</div>
				</section>
			)}

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
							<Link to="/my-library" search={{ page: Math.max(1, stories.page - 1) }}>
								Sebelumnya
							</Link>
						</Button>
					)}
					{stories.hasNextPage ? (
						<Button asChild variant="outline" className="rounded-full">
							<Link to="/my-library" search={{ page: stories.page + 1 }}>
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
