import { useState, useTransition } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { WandSparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "~/components/ui/button";
import { createStoryFn, getViewerFn } from "~/features/stories/story.functions";
import { seo } from "~/utils/seo";

const themeOptions = [
	"Petualangan hutan",
	"Laut ajaib",
	"Dinosaurus lucu",
	"Ruang angkasa",
	"Kereta malam",
];

export const Route = createFileRoute("/create")({
	head: () => ({
		meta: seo({
			title: "Buat Cerita | Alkisah",
			description:
				"Isi detail anak dan tema favoritnya untuk membuat cerita empat bagian dengan ilustrasi AI.",
		}),
	}),
	loader: () => getViewerFn(),
	component: CreateStoryPage,
});

function CreateStoryPage() {
	const viewer = Route.useLoaderData();
	const router = useRouter();
	const createStory = useServerFn(createStoryFn);
	const [isPending, startTransition] = useTransition();
	const [formState, setFormState] = useState({
		childName: "",
		age: "5",
		theme: themeOptions[0],
		customTheme: "",
	});

	return (
		<div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
			<section className="space-y-5 rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
				<div className="inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700">
					Kuota gratis tersisa hari ini: {viewer.dailyFreeRemaining}
				</div>
				<div className="space-y-3">
					<p className="font-heading text-4xl text-slate-900">Mulai dari tiga detail sederhana.</p>
					<p className="text-sm leading-7 text-slate-600">
						Cerita akan dibangun menjadi empat bagian dengan ritme yang cocok untuk anak, lalu tiap
						bagian dibuatkan ilustrasi sendiri supaya lebih enak dibaca bersama.
					</p>
				</div>
				<div className="rounded-[26px] bg-slate-900 p-5 text-sm leading-7 text-slate-200">
					<p className="font-semibold text-white">Yang akan kamu dapatkan</p>
					<ul className="mt-3 space-y-2">
						<li>4 bagian cerita berurutan</li>
						<li>4 ilustrasi bergaya pastel storybook</li>
						<li>Preview suara gratis untuk setiap bagian</li>
						<li>Audio premium per bagian setelah unlock</li>
					</ul>
				</div>
			</section>

			<section className="rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
				<div className="mb-6 flex items-center gap-3">
					<div className="flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
						<WandSparkles className="size-5" />
					</div>
					<div>
						<p className="font-heading text-3xl text-slate-900">Form Cerita</p>
						<p className="text-sm text-slate-500">
							Semua field wajib diisi dengan singkat dan jelas.
						</p>
					</div>
				</div>
				<form
					className="space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						startTransition(async () => {
							try {
								const result = await createStory({
									data: {
										childName: formState.childName,
										age: Number(formState.age),
										theme: formState.theme,
										customTheme: formState.customTheme,
									},
								});

								await router.navigate({
									to: "/stories/$storyId",
									params: { storyId: result.storyId },
									search: { payment: undefined },
								});
							} catch (error) {
								toast.error(error instanceof Error ? error.message : "Gagal membuat cerita.");
							}
						});
					}}
				>
					<label className="grid gap-2">
						<span className="text-sm font-medium text-slate-700">Nama anak</span>
						<input
							required
							value={formState.childName}
							onChange={(event) => {
								setFormState((value) => ({ ...value, childName: event.target.value }));
							}}
							className="h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-orange-300 focus:bg-white"
							placeholder="Misalnya: Raka"
						/>
					</label>
					<div className="grid gap-5 sm:grid-cols-2">
						<label className="grid gap-2">
							<span className="text-sm font-medium text-slate-700">Usia</span>
							<select
								value={formState.age}
								onChange={(event) => {
									setFormState((value) => ({ ...value, age: event.target.value }));
								}}
								className="h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-orange-300 focus:bg-white"
							>
								{Array.from({ length: 8 }, (_, index) => index + 3).map((age) => (
									<option key={age} value={age}>
										{age} tahun
									</option>
								))}
							</select>
						</label>
						<label className="grid gap-2">
							<span className="text-sm font-medium text-slate-700">Tema utama</span>
							<select
								value={formState.theme}
								onChange={(event) => {
									setFormState((value) => ({ ...value, theme: event.target.value }));
								}}
								className="h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 outline-none transition focus:border-orange-300 focus:bg-white"
							>
								{themeOptions.map((theme) => (
									<option key={theme} value={theme}>
										{theme}
									</option>
								))}
							</select>
						</label>
					</div>
					<label className="grid gap-2">
						<span className="text-sm font-medium text-slate-700">Tambahan detail tema</span>
						<textarea
							rows={4}
							value={formState.customTheme}
							onChange={(event) => {
								setFormState((value) => ({ ...value, customTheme: event.target.value }));
							}}
							className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-orange-300 focus:bg-white"
							placeholder="Misalnya: suka hujan malam, ada kucing putih, nuansanya lembut dan lucu."
						/>
					</label>
					<Button
						type="submit"
						size="lg"
						disabled={isPending}
						className="h-13 rounded-full bg-slate-900 px-7 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
					>
						{isPending ? "Menyusun cerita..." : "Generate Cerita"}
					</Button>
				</form>
			</section>
		</div>
	);
}
