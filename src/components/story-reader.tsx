import { useEffect, useEffectEvent, useRef, useState } from "react";
import { BookOpenText, MoonStar, PauseCircle, PlayCircle, Volume2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { StoryDetail } from "~/features/stories/story.types";

type StoryReaderProps = {
	story: StoryDetail;
	isPublic?: boolean;
	audioGenerationIndex?: number | null;
	imageRetryIndex?: number | null;
	nightMode?: boolean;
	readingMode?: boolean;
	voiceMode?: boolean;
	regenerationIndex?: number | null;
	regenerationPrompts?: Record<number, string>;
	onGenerateAudio?: (index: number) => void;
	onRegeneratePart?: (index: number) => void;
	onRegenerationPromptChange?: (index: number, prompt: string) => void;
	onRetryIllustration?: (index: number) => void;
	onToggleNightMode?: () => void;
	onToggleReadingMode?: () => void;
	onToggleVoiceMode?: () => void;
};

export function StoryReader({
	story,
	isPublic = false,
	audioGenerationIndex = null,
	imageRetryIndex = null,
	nightMode = false,
	readingMode = false,
	voiceMode = false,
	regenerationIndex = null,
	regenerationPrompts = {},
	onGenerateAudio,
	onRegeneratePart,
	onRegenerationPromptChange,
	onRetryIllustration,
	onToggleNightMode,
	onToggleReadingMode,
	onToggleVoiceMode,
}: StoryReaderProps) {
	const [speakingOrder, setSpeakingOrder] = useState<number | null>(null);
	const [playingVoiceOrder, setPlayingVoiceOrder] = useState<number | null>(null);
	const audioRefs = useRef<Record<number, HTMLAudioElement | null>>({});

	const stopPreview = useEffectEvent(() => {
		window.speechSynthesis?.cancel();
		setSpeakingOrder(null);
	});

	const stopVoicePlayback = useEffectEvent(() => {
		for (const audio of Object.values(audioRefs.current)) {
			if (!audio) {
				continue;
			}

			audio.pause();
			audio.currentTime = 0;
		}

		setPlayingVoiceOrder(null);
	});

	const pauseOtherVoices = useEffectEvent((currentOrder: number) => {
		for (const [order, audio] of Object.entries(audioRefs.current)) {
			if (!audio || Number(order) === currentOrder) {
				continue;
			}

			audio.pause();
			audio.currentTime = 0;
		}
	});

	const speakPreview = useEffectEvent((order: number, narrations: string[]) => {
		if (typeof window === "undefined" || !window.speechSynthesis) {
			return;
		}

		window.speechSynthesis.cancel();
		const utterance = new SpeechSynthesisUtterance(narrations.join(" "));
		utterance.lang = "id-ID";
		utterance.rate = 0.95;
		utterance.onstart = () => {
			setSpeakingOrder(order);
		};
		utterance.onend = () => {
			setSpeakingOrder(null);
		};
		utterance.onerror = () => {
			setSpeakingOrder(null);
		};
		window.speechSynthesis.speak(utterance);
	});

	const playNextVoice = useEffectEvent(async (order: number) => {
		const nextPart = story.parts.find((part) => part.order > order && part.voiceUrl);
		if (!voiceMode || !nextPart?.voiceUrl) {
			setPlayingVoiceOrder(null);
			return;
		}

		const nextAudio = audioRefs.current[nextPart.order];
		if (!nextAudio) {
			setPlayingVoiceOrder(null);
			return;
		}

		try {
			await nextAudio.play();
		} catch {
			setPlayingVoiceOrder(null);
		}
	});

	useEffect(() => {
		return () => {
			window.speechSynthesis?.cancel();
			for (const audio of Object.values(audioRefs.current)) {
				audio?.pause();
			}
		};
	}, []);

	useEffect(() => {
		if (!voiceMode || !story.canListenToPaidAudio) {
			return;
		}

		for (const part of story.parts) {
			if (!part.voiceUrl) {
				continue;
			}

			const audio = audioRefs.current[part.order];
			if (!audio) {
				continue;
			}

			audio.preload = "auto";
			audio.load();
		}
	}, [story.canListenToPaidAudio, story.parts, voiceMode]);

	return (
		<section
			className={`rounded-[32px] border px-5 py-6 shadow-[0_28px_90px_rgba(15,23,42,0.12)] sm:px-8 sm:py-8 ${
				nightMode
					? "border-slate-700 bg-slate-950 text-slate-100"
					: "border-white/60 bg-white/80 text-slate-900"
			}`}
		>
			<div className="mb-8 flex flex-wrap items-center justify-between gap-4">
				<div>
					<p className={`text-sm font-medium ${nightMode ? "text-slate-300" : "text-slate-500"}`}>
						{isPublic ? "Cerita Publik" : "Mode Membaca"}
					</p>
					<p className="font-heading text-3xl">{story.title}</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					{!isPublic ? (
						<Button
							type="button"
							variant={readingMode ? "secondary" : "outline"}
							className="rounded-full"
							onClick={() => {
								stopPreview();
								stopVoicePlayback();
								onToggleReadingMode?.();
							}}
						>
							<BookOpenText className="size-4" />
							{readingMode ? "Keluar dari Mode Baca" : "Mode Baca"}
						</Button>
					) : null}
					<Button
						type="button"
						variant={voiceMode ? "secondary" : "outline"}
						className="rounded-full"
						onClick={() => {
							stopPreview();
							stopVoicePlayback();
							onToggleVoiceMode?.();
						}}
					>
						<Volume2 className="size-4" />
						{voiceMode ? "Mode Suara Aktif" : "Mode Suara"}
					</Button>
					<Button
						type="button"
						variant={nightMode ? "secondary" : "outline"}
						className="rounded-full"
						onClick={() => {
							stopPreview();
							stopVoicePlayback();
							onToggleNightMode?.();
						}}
					>
						<MoonStar className="size-4" />
						Baca Malam
					</Button>
				</div>
			</div>

			<div className="space-y-12">
				{story.parts.map((part) => {
					const canUsePaidAudio = story.canListenToPaidAudio && part.voiceUrl;
					const isSpeaking = speakingOrder === part.order;
					const isGeneratingAudio = audioGenerationIndex === part.order - 1;
					const isRetryingIllustration = imageRetryIndex === part.order - 1;
					const isRegeneratingPart = regenerationIndex === part.order - 1;
					const regenerationPrompt = regenerationPrompts[part.order - 1] ?? "";
					const hasAudioGenerationInProgress =
						isGeneratingAudio || part.voiceStatus === "generating";
					const hasLockedAudioForRegeneration =
						part.voiceStatus === "generated" || Boolean(part.voiceUrl);
					const canRegeneratePart =
						!isPublic &&
						!readingMode &&
						Boolean(onRegeneratePart) &&
						!hasLockedAudioForRegeneration &&
						!hasAudioGenerationInProgress;
					const canRetryIllustration = !isPublic && !readingMode && Boolean(onRetryIllustration);
					const showActionRow = canUsePaidAudio || !readingMode;

					return (
						<article
							key={part.order}
							className={`grid gap-5 rounded-[28px] sm:grid-cols-[1.2fr_1fr] ${
								nightMode ? "border-slate-800 bg-slate-900/70" : "border-slate-900/5 bg-slate-50/80"
							}`}
						>
							<div className="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#ffe1cb_0%,#f8d6ff_40%,#d1ebff_100%)]">
								{part.illustrationUrl ? (
									<img
										src={part.illustrationUrl}
										alt={`${story.title} bagian ${part.order}`}
										decoding="async"
										fetchPriority={part.order === 1 ? "high" : "auto"}
										loading={part.order === 1 ? "eager" : "lazy"}
										className="aspect-[4/3] h-full w-full object-cover"
									/>
								) : (
									<div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 px-6 text-center">
										<Volume2 className="size-8 opacity-60" />
										<div className="w-full max-w-xs space-y-2">
											<p className="text-sm font-medium text-slate-700">
												{part.illustrationStatus === "failed"
													? "Ilustrasi gagal dibuat"
													: "Ilustrasi sedang dibuat"}
											</p>
											<div className="h-2 overflow-hidden rounded-full bg-white/70">
												<div
													className={`h-full rounded-full bg-slate-900 transition-all duration-500 ${
														part.illustrationStatus === "generating" ? "w-2/3" : "w-1/4"
													}`}
												/>
											</div>
											{part.illustrationFailureReason ? (
												<p className="text-xs text-rose-600">{part.illustrationFailureReason}</p>
											) : null}
											{part.illustrationStatus === "failed" && canRetryIllustration ? (
												<Button
													type="button"
													variant="outline"
													disabled={isRetryingIllustration}
													className="mt-2 rounded-full"
													onClick={() => {
														onRetryIllustration?.(part.order - 1);
													}}
												>
													{isRetryingIllustration ? "Mencoba lagi..." : "Generate Ulang Ilustrasi"}
												</Button>
											) : null}
										</div>
									</div>
								)}
							</div>
							<div className="flex flex-col gap-4">
								<div className="inline-flex w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
									Bagian {part.order}
								</div>
								{voiceMode ? null : (
									<div className="space-y-3 text-[15px] leading-7">
										{part.narrations.map((narration, index) => (
											<p
												key={`${part.order}-${index}`}
												className={nightMode ? "text-slate-200" : "text-slate-700"}
											>
												{narration}
											</p>
										))}
									</div>
								)}
								{canRegeneratePart ? (
									<div
										className={`rounded-[20px] border p-4 ${
											nightMode
												? "border-slate-700 bg-slate-950/60"
												: "border-slate-200 bg-white/90"
										}`}
									>
										<div className="flex flex-wrap items-center justify-between gap-3">
											<p
												className={`text-sm font-semibold ${nightMode ? "text-slate-100" : "text-slate-900"}`}
											>
												Regenerate bagian ini
											</p>
											<p className={`text-xs ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
												Percobaan {part.regenerationAttempts} / 3
											</p>
										</div>
										<textarea
											rows={3}
											value={regenerationPrompt}
											onChange={(event) => {
												onRegenerationPromptChange?.(part.order - 1, event.target.value);
											}}
											className={`mt-3 w-full rounded-[18px] border px-4 py-3 text-sm outline-none transition ${
												nightMode
													? "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
													: "border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400"
											}`}
											placeholder="Misalnya: buat bagian ini lebih lucu, tambahkan kejutan kecil, dan tetap lembut sebelum tidur."
										/>
										<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
											<p className={`text-xs ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
												Teks dan ilustrasi bagian ini akan disesuaikan ulang. Audio tidak diubah.
											</p>
											<Button
												type="button"
												variant="outline"
												disabled={
													isRegeneratingPart ||
													part.regenerationAttempts >= 3 ||
													regenerationPrompt.trim().length < 5
												}
												className="rounded-full"
												onClick={() => {
													onRegeneratePart?.(part.order - 1);
												}}
											>
												{isRegeneratingPart ? "Mengubah bagian..." : "Regenerate Bagian"}
											</Button>
										</div>
									</div>
								) : !isPublic && !readingMode && hasLockedAudioForRegeneration ? (
									<div
										className={`rounded-[20px] border p-4 ${
											nightMode
												? "border-slate-700 bg-slate-950/60"
												: "border-slate-200 bg-white/90"
										}`}
									>
										<p className={`text-sm ${nightMode ? "text-slate-300" : "text-slate-600"}`}>
											Bagian ini sudah punya audio, jadi teksnya tidak bisa diregenerate lagi.
										</p>
									</div>
								) : !isPublic && !readingMode && hasAudioGenerationInProgress ? (
									<div
										className={`rounded-[20px] border p-4 ${
											nightMode
												? "border-slate-700 bg-slate-950/60"
												: "border-slate-200 bg-white/90"
										}`}
									>
										<p className={`text-sm ${nightMode ? "text-slate-300" : "text-slate-600"}`}>
											Audio bagian ini sedang dibuat. Tunggu sampai selesai sebelum mengubah
											teksnya.
										</p>
									</div>
								) : null}
								<div
									className={`mt-auto flex flex-wrap items-center gap-3 ${showActionRow ? "" : "hidden"}`}
								>
									{canUsePaidAudio ? (
										<audio
											ref={(element) => {
												audioRefs.current[part.order] = element;
											}}
											controls
											preload={voiceMode ? "auto" : "metadata"}
											src={part.voiceUrl}
											className="w-full sm:max-w-xs"
											onPlay={() => {
												stopPreview();
												pauseOtherVoices(part.order);
												setPlayingVoiceOrder(part.order);
											}}
											onPause={() => {
												const audio = audioRefs.current[part.order];
												if (!audio?.ended && playingVoiceOrder === part.order) {
													setPlayingVoiceOrder(null);
												}
											}}
											onEnded={() => {
												void playNextVoice(part.order);
											}}
										/>
									) : (
										<Button
											type="button"
											variant="outline"
											className={`rounded-full ${
												nightMode
													? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white"
													: ""
											}`}
											onClick={() => {
												if (isSpeaking) {
													stopPreview();
													return;
												}

												speakPreview(part.order, part.narrations);
											}}
										>
											{isSpeaking ? (
												<PauseCircle className="size-4" />
											) : (
												<PlayCircle className="size-4" />
											)}
											{isSpeaking ? "Stop Preview" : "Preview Suara"}
										</Button>
									)}
									{canUsePaidAudio && !isPublic && !readingMode ? (
										<a
											href={part.voiceUrl}
											download
											className={`text-sm font-semibold ${nightMode ? "text-orange-200" : "text-orange-600"}`}
										>
											Unduh audio bagian ini
										</a>
									) : canUsePaidAudio ? null : story.isPaid && onGenerateAudio && !readingMode ? (
										<>
											<Button
												type="button"
												variant="outline"
												disabled={
													isGeneratingAudio ||
													part.voiceStatus === "generating" ||
													isRegeneratingPart
												}
												className="rounded-full"
												onClick={() => {
													onGenerateAudio(part.order - 1);
												}}
											>
												{isGeneratingAudio || part.voiceStatus === "generating"
													? "Membuat audio..."
													: "Generate Audio"}
											</Button>
											<p className={`text-sm ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
												{part.voiceFailureReason
													? part.voiceFailureReason
													: "Buat audio premium untuk bagian ini saat diperlukan."}
											</p>
										</>
									) : story.isPaid && !readingMode ? (
										<p className={`text-sm ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
											{isPublic
												? "Audio premium untuk bagian ini belum tersedia."
												: "Audio premium untuk bagian ini belum dibuat."}
										</p>
									) : !readingMode ? (
										<p className={`text-sm ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
											Audio premium terbuka setelah pembayaran.
										</p>
									) : null}
								</div>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}
