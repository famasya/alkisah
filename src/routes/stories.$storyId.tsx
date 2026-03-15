import { useEffect, useState, useTransition } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Globe2, LockKeyhole, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { StoryReader } from "~/components/story-reader";
import { Button } from "~/components/ui/button";
import {
	confirmStoryPaymentFromRedirectFn,
	createPaymentLinkFn,
	generateStoryPartAudioFn,
	getOwnedStoryFn,
	processStoryIllustrationsFn,
	regenerateStoryPartFn,
	retryStoryPartIllustrationFn,
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
	const getOwnedStory = useServerFn(getOwnedStoryFn);
	const confirmStoryPaymentFromRedirect = useServerFn(confirmStoryPaymentFromRedirectFn);
	const createPaymentLink = useServerFn(createPaymentLinkFn);
	const generateStoryPartAudio = useServerFn(generateStoryPartAudioFn);
	const processStoryIllustrations = useServerFn(processStoryIllustrationsFn);
	const regenerateStoryPart = useServerFn(regenerateStoryPartFn);
	const retryStoryPartIllustration = useServerFn(retryStoryPartIllustrationFn);
	const setStoryPublicState = useServerFn(setStoryPublicStateFn);
	const [story, setStory] = useState(loadedStory);
	const [audioGenerationIndex, setAudioGenerationIndex] = useState<number | null>(null);
	const [imageRetryIndex, setImageRetryIndex] = useState<number | null>(null);
	const [nightMode, setNightMode] = useState(false);
	const [readingMode, setReadingMode] = useState(false);
	const [regenerationIndex, setRegenerationIndex] = useState<number | null>(null);
	const [regenerationPrompts, setRegenerationPrompts] = useState<Record<number, string>>({});
	const [customer, setCustomer] = useState({
		name: "",
		email: "",
		mobile: "",
	});
	const [isPending, startTransition] = useTransition();
	const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

	useEffect(() => {
		setStory(loadedStory);
	}, [loadedStory]);

	useEffect(() => {
		if (search.payment !== "success" || story.isPaid || isConfirmingPayment) {
			return;
		}

		let cancelled = false;

		void (async () => {
			setIsConfirmingPayment(true);
			try {
				const confirmedStory = await confirmStoryPaymentFromRedirect({
					data: { storyId: story.id },
				});
				if (!cancelled) {
					setStory(confirmedStory);
					await router.invalidate();
				}
			} catch (error) {
				if (!cancelled) {
					toast.error(
						error instanceof Error ? error.message : "Gagal memverifikasi pembayaran Mayar.",
					);
				}
			} finally {
				if (!cancelled) {
					setIsConfirmingPayment(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [
		confirmStoryPaymentFromRedirect,
		isConfirmingPayment,
		router,
		search.payment,
		story.id,
		story.isPaid,
	]);

	useEffect(() => {
		if (story.status !== "payment_pending" && story.status !== "generating") {
			return;
		}

		let cancelled = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;

		const tick = async () => {
			try {
				const nextStory = await getOwnedStory({
					data: { storyId: story.id },
				});

				if (!cancelled) {
					setStory(nextStory);
				}
			} catch {
				// Intentionally ignore transient polling failures.
			} finally {
				if (!cancelled) {
					timeoutId = setTimeout(tick, 2500);
				}
			}
		};

		timeoutId = setTimeout(tick, 1200);

		return () => {
			cancelled = true;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [getOwnedStory, story.id, story.status]);

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
			(value.status === "generated" || value.status === "paid") &&
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

	const canReadStory =
		story.parts.length > 0 && (story.status === "generated" || story.status === "paid");
	const topBadge =
		story.status === "payment_pending"
			? "Menunggu Pembayaran"
			: story.status === "generating"
				? story.isPaid
					? "Premium Sedang Dibuat"
					: "Sedang Menulis Cerita"
				: story.isPaid
					? "Paid Story"
					: "Free Preview";
	const paymentSuccessMessage =
		search.payment === "success"
			? story.isPaid
				? "Pembayaran berhasil. Cerita premium aktif, dan audio sekarang bisa dibuat per bagian saat dibutuhkan."
				: isConfirmingPayment
					? "Pembayaran sedang diverifikasi Mayar. Cerita premium akan otomatis dibuat begitu pembayaran terkonfirmasi."
					: "Pembayaran berhasil dikembalikan dari Mayar. Verifikasi manual sedang diproses."
			: null;

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
								{topBadge}
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
					{paymentSuccessMessage ? (
						<div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
							{paymentSuccessMessage}
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
					{story.status === "payment_pending" && !story.isPaid ? (
						<>
							<div className="space-y-3">
								<div
									className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
										nightMode ? "bg-slate-700 text-white" : "bg-slate-900 text-white"
									}`}
								>
									<LockKeyhole className="mr-2 size-4" />
									Menunggu Pembayaran
								</div>
								<p
									className={`font-heading text-3xl ${nightMode ? "text-slate-50" : "text-slate-900"}`}
								>
									Selesaikan pembayaran Mayar dulu.
								</p>
								<p
									className={`text-sm leading-7 ${nightMode ? "text-slate-300" : "text-slate-600"}`}
								>
									Setelah pembayaran Rp7.000 terkonfirmasi, cerita premium akan otomatis dibuat dan
									tetap private secara default.
								</p>
							</div>
							{story.pendingPaymentLink ? (
								<Button
									type="button"
									className="rounded-full bg-slate-900 text-white"
									onClick={() => {
										window.location.assign(story.pendingPaymentLink!);
									}}
								>
									<Sparkles className="size-4" />
									Lanjutkan Pembayaran
								</Button>
							) : (
								<p className={`text-sm ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
									Link pembayaran sedang disiapkan. Muat ulang halaman jika status ini tidak
									berubah.
								</p>
							)}
						</>
					) : story.status === "generating" && !canReadStory ? (
						<>
							<div className="space-y-3">
								<div
									className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
										nightMode
											? "bg-emerald-200/15 text-emerald-200"
											: "bg-emerald-100 text-emerald-700"
									}`}
								>
									<Sparkles className="mr-2 size-4" />
									Sedang Diproses
								</div>
								<p
									className={`font-heading text-3xl ${nightMode ? "text-slate-50" : "text-slate-900"}`}
								>
									Cerita premium sedang dibuat.
								</p>
								<p
									className={`text-sm leading-7 ${nightMode ? "text-slate-300" : "text-slate-600"}`}
								>
									Teks cerita sedang disusun setelah pembayaran berhasil. Halaman ini akan
									menyegarkan diri otomatis saat hasilnya siap.
								</p>
							</div>
						</>
					) : story.status === "failed" && !canReadStory ? (
						<>
							<div className="space-y-3">
								<div
									className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
										nightMode ? "bg-rose-200/15 text-rose-200" : "bg-rose-100 text-rose-700"
									}`}
								>
									<LockKeyhole className="mr-2 size-4" />
									Gagal Diproses
								</div>
								<p
									className={`font-heading text-3xl ${nightMode ? "text-slate-50" : "text-slate-900"}`}
								>
									Cerita ini gagal disiapkan.
								</p>
								<p
									className={`text-sm leading-7 ${nightMode ? "text-slate-300" : "text-slate-600"}`}
								>
									{story.failureReason ??
										"Terjadi kendala saat membuat cerita premium. Coba muat ulang halaman ini beberapa saat lagi."}
								</p>
							</div>
						</>
					) : story.isPaid ? (
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
										? "Cerita ini sudah muncul di pustaka publik. Kamu bisa tetap membiarkannya terbuka atau menyembunyikannya kembali kapan saja."
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
									Unlock Premium via Mayar
								</div>
								<p
									className={`font-heading text-3xl ${nightMode ? "text-slate-50" : "text-slate-900"}`}
								>
									Buka audio penuh dan fitur publik.
								</p>
								<p
									className={`text-sm leading-7 ${nightMode ? "text-slate-300" : "text-slate-600"}`}
								>
									Pembayaran Rp7.000 akan dibawa ke checkout Mayar. Setelah pembayaran berhasil,
									audio premium tetap dibuat manual per bagian saat kamu butuh, dan cerita bisa
									dipublikasikan kapan saja.
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
									Bayar Rp7.000 di Mayar
								</Button>
							</form>
						</>
					)}
				</div>
			</section>

			{canReadStory ? (
				<StoryReader
					story={story}
					audioGenerationIndex={audioGenerationIndex}
					imageRetryIndex={imageRetryIndex}
					nightMode={nightMode}
					readingMode={readingMode}
					regenerationIndex={regenerationIndex}
					regenerationPrompts={regenerationPrompts}
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
					onRegeneratePart={(index) => {
						const prompt = regenerationPrompts[index]?.trim() ?? "";
						setRegenerationIndex(index);
						startTransition(async () => {
							try {
								const updatedStory = await regenerateStoryPart({
									data: {
										storyId: story.id,
										index,
										prompt,
									},
								});
								setStory(updatedStory);
								setRegenerationPrompts((current) => ({
									...current,
									[index]: "",
								}));
								toast.success(
									"Bagian cerita diperbarui. Ilustrasi ikut disesuaikan, audio tetap seperti sebelumnya.",
								);
							} catch (error) {
								toast.error(
									error instanceof Error ? error.message : "Gagal mengubah bagian cerita.",
								);
							} finally {
								setRegenerationIndex(null);
							}
						});
					}}
					onRegenerationPromptChange={(index, prompt) => {
						setRegenerationPrompts((current) => ({
							...current,
							[index]: prompt,
						}));
					}}
					onRetryIllustration={(index) => {
						setImageRetryIndex(index);
						startTransition(async () => {
							try {
								const updatedStory = await retryStoryPartIllustration({
									data: {
										storyId: story.id,
										index,
									},
								});
								setStory(updatedStory);
								toast.success("Ilustrasi dicoba lagi untuk bagian ini.");
							} catch (error) {
								toast.error(
									error instanceof Error ? error.message : "Gagal mencoba ulang ilustrasi.",
								);
							} finally {
								setImageRetryIndex(null);
							}
						});
					}}
					onToggleNightMode={() => {
						setNightMode((value) => !value);
					}}
					onToggleReadingMode={() => {
						setReadingMode((value) => !value);
					}}
				/>
			) : (
				<section
					className={`rounded-[32px] border px-5 py-8 shadow-[0_28px_90px_rgba(15,23,42,0.12)] sm:px-8 ${
						nightMode
							? "border-slate-700 bg-slate-950 text-slate-100"
							: "border-white/60 bg-white/80 text-slate-900"
					}`}
				>
					<p className="font-heading text-3xl">
						{story.status === "payment_pending"
							? "Cerita akan muncul setelah pembayaran dikonfirmasi."
							: story.status === "generating"
								? "Cerita sedang disusun."
								: "Cerita belum siap dibaca."}
					</p>
					<p
						className={`mt-3 text-sm leading-7 ${nightMode ? "text-slate-300" : "text-slate-600"}`}
					>
						{story.status === "failed"
							? (story.failureReason ?? "Terjadi kendala saat menyiapkan cerita ini.")
							: "Begitu bagian pertama siap, halaman ini akan menampilkan narasi dan ilustrasinya di sini."}
					</p>
				</section>
			)}
		</div>
	);
}
