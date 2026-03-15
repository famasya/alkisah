import { Link } from "@tanstack/react-router";
import { BookOpenText, LockKeyhole, Sparkles } from "lucide-react";
import type { StoryPrivateLibraryCard } from "~/features/stories/story.types";

export function PrivateLibraryCard({ story }: { story: StoryPrivateLibraryCard }) {
	return (
		<Link
			to="/stories/$storyId"
			params={{ storyId: story.id }}
			search={{ payment: undefined }}
			className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-900/5 bg-white/80 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.16)]"
		>
			<div className="relative aspect-[4/3] overflow-hidden bg-[linear-gradient(135deg,#ffe3ce_0%,#f7d6ff_45%,#cbe8ff_100%)]">
				{story.coverImageUrl ? (
					<img
						src={story.coverImageUrl}
						alt={story.title}
						className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
					/>
				) : (
					<div className="flex h-full items-center justify-center text-slate-600">
						<Sparkles className="size-8" />
					</div>
				)}
				<div className="absolute inset-x-5 bottom-5">
					<div className="inline-flex rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
						{story.theme}
					</div>
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-4 p-5">
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<p className="font-heading text-2xl leading-tight text-slate-900">{story.title}</p>
						<span
							className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
								story.isPublic ? "bg-sky-100 text-sky-700" : "bg-slate-900 text-white"
							}`}
						>
							{story.isPublic ? "Public" : "Private"}
						</span>
					</div>
					<p className="line-clamp-3 text-sm leading-6 text-slate-600">{story.previewExcerpt}</p>
				</div>
				<div className="mt-auto flex items-center justify-between text-xs font-medium text-slate-500">
					<span className="inline-flex items-center gap-2">
						<BookOpenText className="size-4" />
						Usia {story.age}+
					</span>
					<span className="inline-flex items-center gap-2">
						<LockKeyhole className="size-4" />
						{story.isPublic ? "Sudah dibagikan" : "Hanya kamu"}
					</span>
				</div>
			</div>
		</Link>
	);
}
