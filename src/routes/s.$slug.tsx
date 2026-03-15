import { createFileRoute } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { StoryReader } from "~/components/story-reader";
import { Button } from "~/components/ui/button";
import { getPublicStoryFn } from "~/features/stories/story.functions";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/s/$slug")({
	head: () => ({
		meta: seo({
			title: "Cerita Publik | Alkisah",
			description:
				"Baca cerita publik yang dibuat dengan Alkisah dan dengarkan audionya per bagian.",
		}),
	}),
	loader: ({ params }) => getPublicStoryFn({ data: { slug: params.slug } }),
	component: PublicStoryPage,
});

function PublicStoryPage() {
	const story = Route.useLoaderData();

	return (
		<div className="space-y-7">
			<section className="rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-3">
						<div className="inline-flex rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
							Public Story • {story.viewsCount} views
						</div>
						<p className="font-heading text-4xl text-slate-900">{story.title}</p>
						<p className="max-w-2xl text-sm leading-7 text-slate-600">
							Dibuat untuk {story.childName}. Cerita ini dibagikan oleh keluarganya ke perpustakaan
							Alkisah.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						className="rounded-full"
						onClick={async () => {
							await navigator.clipboard.writeText(window.location.href);
							toast.success("Link cerita publik tersalin.");
						}}
					>
						Salin Link
					</Button>
				</div>
			</section>
			<StoryReader story={story} isPublic />
		</div>
	);
}
