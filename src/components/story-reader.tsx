import { useEffect, useEffectEvent, useState } from "react";
import { MoonStar, PauseCircle, PlayCircle, Volume2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { StoryDetail } from "~/features/stories/story.types";

type StoryReaderProps = {
	story: StoryDetail;
	isPublic?: boolean;
};

export function StoryReader({ story, isPublic = false }: StoryReaderProps) {
	const [nightMode, setNightMode] = useState(false);
	const [speakingOrder, setSpeakingOrder] = useState<number | null>(null);

	const stopPreview = useEffectEvent(() => {
		window.speechSynthesis?.cancel();
		setSpeakingOrder(null);
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

	useEffect(() => {
		return () => {
			window.speechSynthesis?.cancel();
		};
	}, []);

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
				<Button
					type="button"
					variant={nightMode ? "secondary" : "outline"}
					className="rounded-full"
					onClick={() => {
						stopPreview();
						setNightMode((value) => !value);
					}}
				>
					<MoonStar className="size-4" />
					Baca Malam
				</Button>
			</div>

			<div className="space-y-6">
				{story.parts.map((part) => {
					const canUsePaidAudio = story.canListenToPaidAudio && part.voiceUrl;
					const isSpeaking = speakingOrder === part.order;

					return (
						<article
							key={part.order}
							className={`grid gap-5 rounded-[28px] border p-4 sm:grid-cols-[1.2fr_1fr] sm:p-5 ${
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
									<div className="flex aspect-[4/3] items-center justify-center">
										<Volume2 className="size-8 opacity-60" />
									</div>
								)}
							</div>
							<div className="flex flex-col gap-4">
								<div className="inline-flex w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
									Bagian {part.order}
								</div>
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
								<div className="mt-auto flex flex-wrap items-center gap-3">
									{canUsePaidAudio ? (
										<audio
											controls
											preload="none"
											src={part.voiceUrl}
											className="w-full sm:max-w-xs"
										/>
									) : (
										<Button
											type="button"
											variant="outline"
											className="rounded-full"
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
									{canUsePaidAudio ? (
										<a
											href={part.voiceUrl}
											download
											className={`text-sm font-semibold ${nightMode ? "text-orange-200" : "text-orange-600"}`}
										>
											Unduh audio bagian ini
										</a>
									) : (
										<p className={`text-sm ${nightMode ? "text-slate-400" : "text-slate-500"}`}>
											Audio penuh terbuka setelah pembayaran.
										</p>
									)}
								</div>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}
