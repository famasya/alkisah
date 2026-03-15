import { useEffect, useState, useTransition } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { StoryReader } from "~/components/story-reader";
import { Button } from "~/components/ui/button";
import {
	createPaymentLinkFn,
	generateStoryPartAudioFn,
	getOwnedStoryFn,
	processStoryIllustrationsFn,
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
			description:
				"Baca hasil cerita personal, simpan private secara default, atau bagikan ke publik.",
		}),
	}),
	loader: ({ params }) => getOwnedStoryFn({ data: { storyId: params.storyId } }),
	component: StoryDetailPage,
});

function StoryDetailPage() {
	const loadedStory = Route.useLoaderData();
	const search = Route.useSearch();
	const router = useRouter();
	const createPaymentLink = useServerFn(createPaymentLinkFn);
	const generateStoryPartAudio = useServerFn(generateStoryPartAudioFn);
	const processStoryIllustrations = useServerFn(processStoryIllustrationsFn);
	const setStoryPublicState = useServerFn(setStoryPublicStateFn);
	const [story, setStory] = useState(loadedStory);
	const [audioGenerationIndex, setAudioGenerationIndex] = useState<number | null>(null);
	const [nightMode, setNightMode] = useState(false);
	const [customer, setCustomer] = useState({
		name: "",
		email: "",
		mobile: "",
	});
	const [isPending, startTransition] = useTransition();

	useEffect(() => {
		setStory(loadedStory);
	}, [loadedStory]);

	useEffect(() => {
		document.documentElement.classList.toggle("story-night-mode", nightMode);
		document.body.classList.toggle("story-night-mode", nightMode);

		return () => {
			document.documentElement.classList.remove("story-night-mode");
			document.body.classList.remove("story-night-mode");
		};
	}, [nightMode]);

	useEffect(() => {
		let cancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		let inFlight = false;

		const hasPendingIllustrations = (value: typeof story) =>
			value.parts.some(
				(part) => part.illustrationStatus === "queued" || part.illustrationStatus === "generating",
			);

		const markNextIllustrationGenerating = () => {
			setStory((current) => {
				const nextIndex = current.parts.findIndex(
					(part) => part.illustrationStatus === "queued" && !part.illustrationUrl,
				);
				if (nextIndex < 0) {
					return current;
				}

				return {
					...current,
					parts: current.parts.map((part, index) =>
						index === nextIndex ? { ...part, illustrationStatus: "generating" } : part,
					),
				};
			});
		};

		const tick = async () => {
			if (cancelled || inFlight || !hasPendingIllustrations(story)) {
				return;
			}

			inFlight = true;
			markNextIllustrationGenerating();

			try {
				const nextStory = await processStoryIllustrations({
					data: { storyId: story.id },
				});
				if (!cancelled) {
					setStory(nextStory);
				}
			} catch {
				if (!cancelled) {
					timeoutId = setTimeout(tick, 3000);
				}
			} finally {
				inFlight = false;
				if (!cancelled) {
					timeoutId = setTimeout(tick, 400);
				}
			}
		};

		timeoutId = setTimeout(tick, 150);

		return () => {
			cancelled = true;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [processStoryIllustrations, story]);

	return (
		<div
			className={`space-y-7 transition-colors ${nightMode ? "rounded-[36px]text-slate-100" : ""}`}
		>
			<section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
				<div
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
									nightMode ? "bg-orange-200/15 text-orange-200" : "bg-orange-100 text-orange-700"
								}`}
							>
								{story.isPaid ? "Paid Story" : "Free Preview"}
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
								{story.childName} • usia {story.age}+ • tema {story.theme}
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
							Unlock selesai. Cerita premium aktif, dan audio sekarang bisa dibuat per bagian saat
							dibutuhkan.
						</div>
					) : null}
				</div>

				<div
					className={`space-y-5 rounded-[32px] border p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)] ${
						nightMode
							? "border-slate-800 bg-slate-900/90 text-slate-100"
							: "border-white/70 bg-white/80"
					}`}
				>
					{story.isPaid ? (
						<>
							<div className="space-y-3">
								<div
									className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
										nightMode
											? "bg-emerald-200/15 text-emerald-200"
											: "bg-emerald-100 text-emerald-700"
									}`}
								>
									<Globe2 className="mr-2 size-4" />
									Unlock Selesai
								</div>
								<p
									className={`font-heading text-3xl ${nightMode ? "text-slate-50" : "text-slate-900"}`}
								>
									{story.isPublic
										? "Cerita ini sedang tampil di publik."
										: "Cerita ini siap dipublikasikan."}
								</p>
								<p
									className={`text-sm leading-7 ${nightMode ? "text-slate-300" : "text-slate-600"}`}
								>
									{story.isPublic
										? "Cerita ini sudah muncul di perpustakaan publik. Kamu bisa tetap membiarkannya terbuka atau menyembunyikannya kembali kapan saja."
										: "Setelah unlock, cerita premium otomatis tetap private dan masuk ke Cerita Saya. Kamu bisa membiarkannya tetap pribadi atau membagikannya ke library publik kapan saja. Audio per bagian tetap opsional dan bisa dibuat nanti."}
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
											await router.invalidate();
											toast.success(
												result.isPublic
													? "Cerita dipublikasikan."
													: "Cerita disembunyikan dari publik.",
											);
										} catch (error) {
											toast.error(
												error instanceof Error ? error.message : "Gagal mengubah status publik.",
											);
										}
									});
								}}
							>
								{story.isPublic ? "Sembunyikan dari publik" : "Jadikan Publik"}
							</Button>
							{story.publicSlug ? (
								<Link
									to="/s/$slug"
									params={{ slug: story.publicSlug }}
									className="text-sm font-semibold text-orange-600 ml-2"
								>
									Buka versi publik
								</Link>
							) : null}
						</>
					) : (
						<>
							<div className="space-y-3">
								<div
									className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
										nightMode ? "bg-slate-700 text-white" : "bg-slate-900 text-white"
									}`}
								>
									<LockKeyhole className="mr-2 size-4" />
									Unlock Premium Sementara
								</div>
								<p
									className={`font-heading text-3xl ${nightMode ? "text-slate-50" : "text-slate-900"}`}
								>
									Buka audio penuh dan fitur publik.
								</p>
								<p
									className={`text-sm leading-7 ${nightMode ? "text-slate-300" : "text-slate-600"}`}
								>
									Mayar sedang dimatikan untuk sementara. Form ini tetap dipakai agar data pelanggan
									tercatat, lalu cerita akan langsung di-unlock untuk development. Audio tidak
									dibuat otomatis.
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
									<span
										className={`text-sm font-medium ${nightMode ? "text-slate-300" : "text-slate-700"}`}
									>
										Nama orang tua
									</span>
									<input
										required
										value={customer.name}
										onChange={(event) => {
											setCustomer((value) => ({ ...value, name: event.target.value }));
										}}
										className={`h-12 rounded-2xl border px-4 outline-none transition focus:border-orange-300 focus:bg-white ${
											nightMode
												? "border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400"
												: "border-slate-200 bg-slate-50"
										}`}
										placeholder="Nama untuk invoice"
									/>
								</label>
								<label className="grid gap-2">
									<span
										className={`text-sm font-medium ${nightMode ? "text-slate-300" : "text-slate-700"}`}
									>
										Email
									</span>
									<input
										required
										type="email"
										value={customer.email}
										onChange={(event) => {
											setCustomer((value) => ({ ...value, email: event.target.value }));
										}}
										className={`h-12 rounded-2xl border px-4 outline-none transition focus:border-orange-300 focus:bg-white ${
											nightMode
												? "border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400"
												: "border-slate-200 bg-slate-50"
										}`}
										placeholder="nama@email.com"
									/>
								</label>
								<label className="grid gap-2">
									<span
										className={`text-sm font-medium ${nightMode ? "text-slate-300" : "text-slate-700"}`}
									>
										Nomor WhatsApp / mobile
									</span>
									<input
										required
										value={customer.mobile}
										onChange={(event) => {
											setCustomer((value) => ({ ...value, mobile: event.target.value }));
										}}
										className={`h-12 rounded-2xl border px-4 outline-none transition focus:border-orange-300 focus:bg-white ${
											nightMode
												? "border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-400"
												: "border-slate-200 bg-slate-50"
										}`}
										placeholder="0812xxxxxxxx"
									/>
								</label>
								<Button
									type="submit"
									disabled={isPending}
									className={`w-full rounded-full ${
										nightMode
											? "border border-slate-600 bg-transparent text-slate-100 hover:bg-slate-800"
											: "bg-slate-900 text-white"
									}`}
								>
									<Sparkles className="size-4" />
									Unlock Sekarang
								</Button>
							</form>
						</>
					)}
				</div>
			</section>

			<StoryReader
				story={story}
				audioGenerationIndex={audioGenerationIndex}
				nightMode={nightMode}
				onGenerateAudio={(index) => {
					setAudioGenerationIndex(index);
					startTransition(async () => {
						try {
							const updatedStory = await generateStoryPartAudio({
								data: {
									storyId: story.id,
									index,
								},
							});
							setStory(updatedStory);
							const targetPart = updatedStory.parts[index];
							if (targetPart?.voiceUrl) {
								toast.success("Audio bagian selesai dibuat.");
							} else if (targetPart?.voiceFailureReason) {
								toast.error(targetPart.voiceFailureReason);
							}
						} catch (error) {
							toast.error(error instanceof Error ? error.message : "Gagal membuat audio.");
						} finally {
							setAudioGenerationIndex(null);
						}
					});
				}}
				onToggleNightMode={() => {
					setNightMode((value) => !value);
				}}
			/>
		</div>
	);
}
