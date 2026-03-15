import { useEffect, useState } from "react";
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
				"Baca cerita publik yang dibuat dengan Alkisah dan dengarkan audionya jika tersedia.",
		}),
	}),
	loader: ({ params }) => getPublicStoryFn({ data: { slug: params.slug } }),
	component: PublicStoryPage,
});

function PublicStoryPage() {
	const story = Route.useLoaderData();
	const [nightMode, setNightMode] = useState(false);

	useEffect(() => {
		document.documentElement.classList.toggle("story-night-mode", nightMode);
		document.body.classList.toggle("story-night-mode", nightMode);

		return () => {
			document.documentElement.classList.remove("story-night-mode");
			document.body.classList.remove("story-night-mode");
		};
	}, [nightMode]);

	return (
		<div
			className={`space-y-7 transition-colors ${nightMode ? "rounded-[36px] text-slate-100" : ""}`}
		>
			<section
				className={`rounded-[32px] border p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)] ${
					nightMode
						? "border-slate-800 bg-slate-900/90 text-slate-100"
						: "border-white/70 bg-white/80"
				}`}
			>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="space-y-3">
						<div
							className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
								nightMode ? "bg-sky-200/15 text-sky-200" : "bg-sky-100 text-sky-700"
							}`}
						>
							Public Story • {story.viewsCount} views
						</div>
						<p
							className={`font-heading text-4xl ${nightMode ? "text-slate-50" : "text-slate-900"}`}
						>
							{story.title}
						</p>
						<p
							className={`max-w-2xl text-sm leading-7 ${
								nightMode ? "text-slate-300" : "text-slate-600"
							}`}
						>
							Dibuat untuk {story.childName}. Cerita ini dibagikan oleh pemilik cerita ke pustaka
							publik Alkisah.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						className={
							nightMode
								? "rounded-full border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
								: "rounded-full"
						}
						onClick={async () => {
							await navigator.clipboard.writeText(window.location.href);
							toast.success("Link cerita publik tersalin.");
						}}
					>
						Salin Link
					</Button>
				</div>
			</section>
			<StoryReader
				story={story}
				isPublic
				nightMode={nightMode}
				onToggleNightMode={() => {
					setNightMode((value) => !value);
				}}
			/>
		</div>
	);
}
