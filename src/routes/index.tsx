import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, BookHeart, LibraryBig, LockKeyhole, WandSparkles } from "lucide-react";
import { Button } from "~/components/ui/button";
import { seo } from "~/utils/seo";

const featureCards = [
	{
		title: "Cerita personal",
		body: "Nama anak, usia, dan tema langsung diolah jadi kisah yang terasa ditulis khusus untuk keluarga Anda.",
		icon: WandSparkles,
	},
	{
		title: "Gratis! dengan opsi premium untuk audio premium",
		body: "Tersedia 3 cerita gratis per hari. Setelah habis, cerita baru tetap bisa dibuat lewat pembayaran Rp7.000 di depan via Mayar dan langsung menjadi premium.",
		icon: LockKeyhole,
	},
	{
		title: "Pustaka Publik",
		body: "Cerita yang dibagikan dapat dipublikasikan di library publik dan bisa dibaca siapa saja tanpa login.",
		icon: LibraryBig,
	},
];

export const Route = createFileRoute("/")({
	head: () => ({
		meta: seo({
			title: "Alkisah | Buat Cerita Anak Custom dalam 10 Detik",
			description:
				"Buat cerita anak yang personal, ilustratif, dan siap dibacakan. Buka audio premium dan share ke publik hanya saat ceritanya sudah pas.",
		}),
	}),
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="space-y-10">
			<section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="space-y-7"
				>
					<div className="space-y-5">
						<p className="font-heading text-5xl leading-[1.02] text-slate-900 sm:text-6xl">
							Buat cerita anak yang terasa seperti ditulis untuk dirimu sendiri
						</p>
						<p className="max-w-2xl text-lg leading-8 text-slate-600">
							Tulis nama anak, pilih usia dan tema, lalu Alkisah menyusun cerita terstruktur dengan
							jumlah bagian yang dinamis sesuai dengan usia anak, ilustrasi storybook per bagian,
							dan audio premium yang bisa Anda akses saat Anda siap membayarnya.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-4">
						<Button
							asChild
							size="lg"
							className="rounded-full bg-slate-900 px-7 text-white shadow-[0_20px_45px_rgba(15,23,42,0.2)]"
						>
							<Link to="/create">
								Buat Cerita Sekarang
								<ArrowRight className="size-4" />
							</Link>
						</Button>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="rounded-full border-white/70 bg-white/70 px-7 backdrop-blur"
						>
							<Link to="/library" search={{ sort: "newest", page: 1 }}>
								Lihat Public Library
							</Link>
						</Button>
					</div>
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)]">
							<p className="text-sm font-medium text-slate-500">Gratis harian</p>
							<p className="mt-3 font-heading text-4xl">3x</p>
						</div>
						<div className="rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)]">
							<p className="text-sm font-medium text-slate-500">Unlock premium</p>
							<p className="mt-3 font-heading text-4xl">Rp7K</p>
						</div>
						<div className="rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.07)]">
							<p className="text-sm font-medium text-slate-500">Format cerita</p>
							<p className="mt-3 font-heading text-4xl">Beragam</p>
						</div>
					</div>
				</motion.div>
				<motion.div
					initial={{ opacity: 0, scale: 0.97 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.6, delay: 0.1 }}
					className="relative"
				>
					<div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-orange-200/70 blur-3xl" />
					<div className="absolute -bottom-10 right-0 h-32 w-32 rounded-full bg-sky-200/80 blur-3xl" />
					<div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white/75 p-6 shadow-[0_34px_100px_rgba(15,23,42,0.14)] backdrop-blur-xl">
						<div className="space-y-5 rounded-[28px] bg-[linear-gradient(145deg,#fff6ee_0%,#fffefb_48%,#f4f9ff_100%)] p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
										Story Preview
									</p>
									<p className="mt-2 font-heading text-3xl text-slate-900">
										Lina dan Kupu-Kupu Pelangi
									</p>
								</div>
								<div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
									3+
								</div>
							</div>
							<div className="grid gap-4">
								{[
									"Bagian 1: Lina menemukan petunjuk ajaib di kebun neneknya.",
									"Bagian 2: Ia belajar merawat kupu-kupu kecil yang terluka.",
									"Bagian 3: Hujan deras membuatnya ragu dan hampir menyerah.",
									"Bagian 4: Kupu-kupu itu terbang lagi, dan Lina pulang dengan hati yang lebih berani.",
								].map((line) => (
									<div
										key={line}
										className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-4 text-sm leading-7 text-slate-600 shadow-sm"
									>
										{line}
									</div>
								))}
							</div>
						</div>
					</div>
				</motion.div>
			</section>

			<section className="grid gap-5 lg:grid-cols-3">
				{featureCards.map((card, index) => (
					<motion.article
						key={card.title}
						initial={{ opacity: 0, y: 18 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.45, delay: 0.1 * index }}
						className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
					>
						<div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
							<card.icon className="size-5" />
						</div>
						<p className="font-heading text-2xl text-slate-900">{card.title}</p>
						<p className="mt-3 text-sm leading-7 text-slate-600">{card.body}</p>
					</motion.article>
				))}
			</section>

			<section className="grid gap-6 rounded-[32px] border border-slate-900/5 bg-slate-900 px-6 py-8 text-white shadow-[0_34px_100px_rgba(15,23,42,0.22)] lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
				<div className="space-y-4">
					<p className="font-heading text-3xl">Cerita yang dibuat dinamis</p>
					<p className="text-sm leading-7 text-slate-300">
						Setiap cerita punya kebutuhan ritme yang berbeda. Makanya, kami tidak memaksakan jumlah
						halaman yang sama untuk semua cerita. Bisa 3 bagian untuk cerita pendek, atau lebih
						panjang kalau ceritanya memang perlu. Hasilnya cerita lebih enak dibaca, lebih hidup,
						dan tetap pas untuk anak-anak.
					</p>
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					{[
						"Ilustrasinya mengikuti guideline cerita anak, bukan sekadar salinan teks.",
						"Suara bisa langsung dicoba gratis lewat Web Speech. Mau kualitas lebih? Upgrade ke audio premium.",
					].map((item) => (
						<div
							key={item}
							className="rounded-[24px] bg-white/8 p-4 text-sm leading-7 text-slate-200"
						>
							<BookHeart className="mb-3 size-5 text-orange-300" />
							{item}
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
