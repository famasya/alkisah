import { useEffect, useState, useTransition } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { StoryReader } from "~/components/story-reader";
import { Button } from "~/components/ui/button";
import {
	createPaymentLinkFn,
	getOwnedStoryFn,
	setStoryPublicStateFn,
} from "~/features/stories/story.functions";
import { seo } from "~/utils/seo";

export const Route = createFileRoute("/stories/$storyId")({
	validateSearch: (search) => ({
		payment: typeof search.payment === "string" ? search.payment : undefined,
	}),
	head: () => ({
		meta: seo({
			title: "Detail Cerita | Alkisah",
			description: "Baca hasil cerita personal, buka audio premium, dan atur status publiknya.",
		}),
	}),
	loader: ({ params }) => getOwnedStoryFn({ data: { storyId: params.storyId } }),
	component: StoryDetailPage,
});

function StoryDetailPage() {
	const loadedStory = Route.useLoaderData();
	const search = Route.useSearch();
	const createPaymentLink = useServerFn(createPaymentLinkFn);
	const setStoryPublicState = useServerFn(setStoryPublicStateFn);
	const [story, setStory] = useState(loadedStory);
	const [customer, setCustomer] = useState({
		name: "",
		email: "",
		mobile: "",
	});
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setStory(loadedStory);
	}, [loadedStory]);

	return (
		<div className="space-y-7">
			<section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
				<div className="rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-3">
							<div className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700">
								{story.isPaid ? "Paid Story" : "Free Preview"}
							</div>
							<p className="font-heading text-4xl text-slate-900">{story.title}</p>
							<p className="max-w-2xl text-sm leading-7 text-slate-600">
								{story.childName} • usia {story.age}+ • tema {story.theme}
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							className="rounded-full"
							onClick={async () => {
								if (!story.publicSlug) {
									toast.error("Publikasikan cerita dulu untuk mendapatkan link share.");
									return;
								}

								await navigator.clipboard.writeText(
									`${window.location.origin}/s/${story.publicSlug}`,
								);
								toast.success("Link publik tersalin.");
							}}
						>
							<Copy className="size-4" />
							Copy Link
						</Button>
					</div>
					{search.payment === "success" ? (
						<div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
							Unlock selesai. Audio premium dan fitur publik sekarang aktif.
						</div>
					) : null}
				</div>

				<div className="space-y-5 rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
					{story.isPaid ? (
						<>
							<div className="space-y-3">
								<div className="inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
									<Globe2 className="mr-2 size-4" />
									Unlock Selesai
								</div>
								<p className="font-heading text-3xl text-slate-900">
									Cerita ini siap dipublikasikan.
								</p>
								<p className="text-sm leading-7 text-slate-600">
									Setelah dipublikasikan, cerita akan muncul di library publik dan bisa dibaca siapa
									pun.
								</p>
							</div>
							<Button
								type="button"
								className="rounded-full bg-slate-900 text-white"
								disabled={isPending}
								onClick={() => {
									startTransition(async () => {
										try {
											const result = await setStoryPublicState({
												data: {
													storyId: story.id,
													isPublic: !story.isPublic,
												},
											});
											setStory((value) => ({
												...value,
												isPublic: result.isPublic,
												publicSlug: result.publicSlug,
											}));
											toast.success(
												result.isPublic
													? "Cerita dipublikasikan."
													: "Cerita disembunyikan dari library.",
											);
										} catch (error) {
											toast.error(
												error instanceof Error ? error.message : "Gagal mengubah status publik.",
											);
										}
									});
								}}
							>
								{story.isPublic ? "Sembunyikan dari Library" : "Jadikan Publik"}
							</Button>
							{story.publicSlug ? (
								<Link
									to="/s/$slug"
									params={{ slug: story.publicSlug }}
									className="text-sm font-semibold text-orange-600"
								>
									Buka versi publik
								</Link>
							) : null}
						</>
					) : (
						<>
							<div className="space-y-3">
								<div className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">
									<LockKeyhole className="mr-2 size-4" />
									Unlock Premium Sementara
								</div>
								<p className="font-heading text-3xl text-slate-900">
									Buka audio penuh dan fitur publik.
								</p>
								<p className="text-sm leading-7 text-slate-600">
									Mayar sedang dimatikan untuk sementara. Form ini tetap dipakai agar data pelanggan
									tercatat, lalu cerita akan langsung di-unlock untuk development.
								</p>
							</div>
							<form
								className="space-y-4"
								onSubmit={(event) => {
									event.preventDefault();
									startTransition(async () => {
										try {
											const result = await createPaymentLink({
												data: {
													storyId: story.id,
													customerName: customer.name,
													customerEmail: customer.email,
													customerMobile: customer.mobile,
												},
											});

											window.location.assign(result.paymentLink);
										} catch (error) {
											toast.error(
												error instanceof Error ? error.message : "Gagal membuat link pembayaran.",
											);
										}
									});
								}}
							>
								<label className="grid gap-2">
									<span className="text-sm font-medium text-slate-700">Nama orang tua</span>
									<input
										required
										value={customer.name}
										onChange={(event) => {
											setCustomer((value) => ({ ...value, name: event.target.value }));
										}}
										className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-orange-300 focus:bg-white"
										placeholder="Nama untuk invoice"
									/>
								</label>
								<label className="grid gap-2">
									<span className="text-sm font-medium text-slate-700">Email</span>
									<input
										required
										type="email"
										value={customer.email}
										onChange={(event) => {
											setCustomer((value) => ({ ...value, email: event.target.value }));
										}}
										className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-orange-300 focus:bg-white"
										placeholder="nama@email.com"
									/>
								</label>
								<label className="grid gap-2">
									<span className="text-sm font-medium text-slate-700">
										Nomor WhatsApp / mobile
									</span>
									<input
										required
										value={customer.mobile}
										onChange={(event) => {
											setCustomer((value) => ({ ...value, mobile: event.target.value }));
										}}
										className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-orange-300 focus:bg-white"
										placeholder="0812xxxxxxxx"
									/>
								</label>
								<Button
									type="submit"
									disabled={isPending}
									className="w-full rounded-full bg-slate-900 text-white"
								>
									<Sparkles className="size-4" />
									Unlock Sekarang
								</Button>
							</form>
						</>
					)}
				</div>
			</section>

			<StoryReader story={story} />
		</div>
	);
}
