import { useState, useTransition } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Loader2, WandSparkles } from "lucide-react";
import toast from "react-hot-toast";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
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
				"Isi detail anak dan tema favoritnya untuk membuat cerita berilustrasi dengan jumlah bagian yang dinamis.",
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
	const hasFreeQuota = viewer.dailyFreeRemaining > 0;
	const [formState, setFormState] = useState({
		childName: "",
		age: "5",
		theme: themeOptions[0],
		customTheme: "",
		customerMobile: viewer.profile.phone ?? "",
	});

	return (
		<motion.div
			initial={{ opacity: 0, y: 24 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]"
		>
			<section className="space-y-5 rounded-[32px] border border-white/70 bg-white/80 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
				<div
					className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
						hasFreeQuota ? "bg-orange-100 text-orange-700" : "bg-slate-900 text-white"
					}`}
				>
					{hasFreeQuota
						? `Kuota gratis tersisa hari ini: ${viewer.dailyFreeRemaining}`
						: "Kuota gratis hari ini sudah habis"}
				</div>
				<div className="space-y-3">
					<p className="font-heading text-4xl text-slate-900">Mulai dari tiga detail sederhana.</p>
					<p className="text-sm leading-7 text-slate-600">
						{hasFreeQuota
							? "Cerita dibagi menjadi 3–8 bagian mengikuti alur yang paling pas untuk anak, atau lebih panjang kalau memang dibutuhkan. Lalu tiap bagian dibuatkan ilustrasinya sendiri supaya lebih nyaman dibaca bersama."
							: "Kuota gratis harianmu sudah terpakai. Anda tetap bisa lanjut membuat cerita baru, tetapi pembayaran Rp7.000 dilakukan di depan melalui Mayar dan cerita premium baru akan dibuat setelah pembayaran dikonfirmasi."}
					</p>
				</div>
				<div className="rounded-[26px] bg-slate-900 p-5 text-sm leading-7 text-slate-200">
					<p className="font-semibold text-white">Yang akan Anda dapatkan</p>
					<ul className="mt-3 space-y-2">
						<li>Cerita yang dinamis sesuai dengan usia anak</li>
						<li>Ilustrasi pastel storybook untuk tiap bagian</li>
						<li>Preview suara gratis untuk setiap bagian</li>
						<li>
							{hasFreeQuota
								? "Audio premium per bagian setelah unlock"
								: "Cerita premium dibuat otomatis setelah pembayaran Mayar berhasil"}
						</li>
					</ul>
				</div>
				{hasFreeQuota ? null : (
					<div className="rounded-[26px] border border-slate-900/10 bg-slate-50 px-5 py-4 text-sm leading-7 text-slate-600">
						Nama dan email diambil otomatis dari akun Clerk Anda untuk checkout Mayar. Setelah
						pembayaran sukses, Anda akan dibawa kembali ke halaman cerita dan generasi cerita
						premium akan berjalan otomatis.
					</div>
				)}
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
										mode: hasFreeQuota ? "free" : "paid",
										customerMobile: hasFreeQuota ? undefined : formState.customerMobile,
									},
								});

								if (result.paymentLink) {
									window.location.assign(result.paymentLink);
									return;
								}

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
					{hasFreeQuota ? null : (
						<div className="grid gap-5 rounded-[26px] border border-slate-200 bg-slate-50/80 p-5">
							<div>
								<p className="font-heading text-2xl text-slate-900">Pembayaran di depan</p>
								<p className="mt-2 text-sm leading-7 text-slate-600">
									Cerita tambahan setelah kuota gratis akan dibuat sebagai cerita premium setelah
									pembayaran Mayar Rp7.000 berhasil.
								</p>
							</div>
							<label className="grid gap-2">
								<span className="text-sm font-medium text-slate-700">Akun untuk invoice</span>
								<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-600">
									<p>{viewer.profile.fullName ?? "Nama akun Clerk akan dipakai otomatis."}</p>
									<p>{viewer.profile.email ?? "Email akun Clerk akan dipakai otomatis."}</p>
								</div>
							</label>
							<label className="grid gap-2">
								<span className="text-sm font-medium text-slate-700">Nomor HP untuk Mayar</span>
								<input
									required
									value={formState.customerMobile}
									onChange={(event) => {
										setFormState((value) => ({ ...value, customerMobile: event.target.value }));
									}}
									className="h-13 rounded-2xl border border-slate-200 bg-white px-4 outline-none transition focus:border-orange-300"
									placeholder="0812xxxxxxxx"
								/>
							</label>
						</div>
					)}
					<Button
						type="submit"
						size="lg"
						disabled={isPending}
						className="h-13 rounded-full bg-slate-900 px-7 text-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
					>
						{isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Menyusun cerita...
							</>
						) : hasFreeQuota ? (
							"Buat cerita"
						) : (
							"Bayar Rp7.000 & Generate Cerita Premium"
						)}
					</Button>
				</form>
			</section>
		</motion.div>
	);
}
