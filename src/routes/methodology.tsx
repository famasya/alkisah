import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Brain, BookOpen, Lightbulb, Image, Heart, ExternalLink } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { seo } from "~/utils/seo";

const methodologySections = [
	{
		title: "Teori Perkembangan Piaget",
		link: "https://id.wikipedia.org/wiki/Teori_perkembangan_kognitif",
		icon: Brain,
		description:
			"Teori ini menjadi inspirasi umum untuk menyesuaikan tingkat kesederhanaan cerita menurut usia, bukan pemetaan tahap yang diterapkan secara kaku.",
		details: [
			{
				age: "0-2 tahun",
				stage: "Sensorimotor",
				implication: "Visual-heavy, tekstur, pengulangan",
			},
			{
				age: "2-7 tahun",
				stage: "Preoperasional",
				implication: "Cerita sederhana, fantasi, visual kuat",
			},
			{
				age: "7-11 tahun",
				stage: "Operasional Konkret",
				implication: "Plot logis, pemecahan masalah",
			},
			{
				age: "11+ tahun",
				stage: "Operasional Formal",
				implication: "Tema kompleks, ambiguitas moral",
			},
		],
	},
	{
		title: "Zona Perkembangan Proksimal (Vygotsky)",
		link: "https://id.wikipedia.org/wiki/Zona_perkembangan_proksimal",
		icon: Lightbulb,
		description:
			"Konsep ini menginspirasi kami untuk menjaga cerita tetap mudah diikuti sambil sesekali mengenalkan ide baru lewat konteks yang ramah anak.",
		points: [
			"Memperkenalkan satu konsep baru dalam satu waktu",
			"Menggunakan petunjuk konteks dan ilustrasi",
			"Memungkinkan anak untuk menarik kesimpulan sendiri",
		],
	},
	{
		title: "Struktur Narasi Anak",
		icon: BookOpen,
		description:
			"Banyak cerita anak yang efektif bergerak dengan pola seperti ini, dan alur yang kami minta dari model biasanya mendekati bentuk tersebut:",
		steps: [
			"Pengenalan karakter",
			"Tujuan atau masalah",
			"Upaya menyelesaikan",
			"Konflik atau rintangan",
			"Resolusi",
			"Pelajaran emosional",
		],
	},
	{
		title: "Interaksi Gambar-Teks",
		icon: Image,
		description:
			"Kami mengarahkan ilustrasi agar sebisa mungkin tidak hanya mengulang teks, tetapi juga menambahkan detail visual pelengkap (complementary storytelling).",
		types: [
			{ type: "Redundant", desc: "Gambar mengulang teks" },
			{ type: "Complementary", desc: "Gambar menambah informasi" },
			{ type: "Counterpoint", desc: "Gambar berkontradiksi dengan teks" },
			{ type: "Parallel", desc: "Gambar dan teks menceritakan bagian berbeda" },
		],
	},
	{
		title: "Perkembangan Moral (Kohlberg)",
		link: "https://id.wikipedia.org/wiki/Tahap_perkembangan_moral_Kohlberg",
		icon: Heart,
		description:
			"Kerangka ini menjadi pengingat untuk menjaga pelajaran emosional tetap sederhana, jelas, dan dekat dengan pengalaman anak kecil.",
		features: [
			"Konsekuensi yang mudah dipahami",
			"Benar vs salah yang sederhana",
			"Empati emosional",
		],
	},
];

export const Route = createFileRoute("/methodology")({
	head: () => ({
		meta: seo({
			title: "Metodologi Cerita | Alkisah",
			description:
				"Pelajari teori dan pendekatan yang menginspirasi pedoman Alkisah dalam menyusun cerita anak yang personal dan hangat.",
		}),
	}),
	component: MethodologyPage,
});

function MethodologyPage() {
	return (
		<div className="space-y-10">
			{/* Header */}
			<motion.section
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="space-y-5"
			>
				<div className="space-y-3">
					<h1 className="font-heading text-4xl text-slate-900 sm:text-5xl">Metodologi Cerita</h1>
					<p className="max-w-3xl text-lg leading-8 text-slate-600">
						Halaman ini menjelaskan teori dan pendekatan yang menginspirasi pedoman penulisan
						Alkisah.
					</p>
				</div>
			</motion.section>

			{/* Overview Card */}
			<motion.section
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.1 }}
				className="rounded-[28px] border border-white/70 bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.15)]"
			>
				<div className="grid gap-8 lg:grid-cols-3">
					<div className="space-y-4 lg:col-span-2">
						<h2 className="font-heading text-2xl">Pedoman Penulisan Cerita Anak</h2>
						<p className="leading-7 text-slate-300">
							Berikut beberapa pendekatan yang kami pakai sebagai arah umum saat menyusun cerita,
							ritme narasi, dan hubungan antara teks dengan ilustrasi:
						</p>
					</div>
					<div className="space-y-4">
						<div className="rounded-[20px] bg-white/10 p-4">
							<p className="text-xs font-medium text-slate-400">Picture Books (3-6 tahun)</p>
							<ul className="mt-2 space-y-1 text-sm text-slate-200">
								<li>• 400-800 kata</li>
								<li>• Ritme dan pengulangan kuat</li>
								<li>• Satu ide inti</li>
								<li>• Visual storytelling</li>
							</ul>
							<p className="mt-3 text-xs leading-6 text-slate-400">
								Ini adalah patokan editorial yang longgar, bukan aturan mutlak untuk setiap cerita.
							</p>
						</div>
					</div>
				</div>
			</motion.section>

			{/* Methodology Sections */}
			<div className="grid gap-6">
				{methodologySections.map((section, index) => (
					<motion.section
						key={section.title}
						initial={{ opacity: 0, y: 18 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
						className="rounded-[28px] border border-white/70 bg-white/80 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)]"
					>
						<div className="flex items-start gap-4">
							<div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
								<section.icon className="size-5" />
							</div>
							<div className="flex-1 space-y-4">
								<h2 className="font-heading text-2xl text-slate-900">
									<a
										href={section.link}
										target="_blank"
										className={cn(
											section.link &&
												"underline decoration-slate-900 decoration-dotted underline-offset-4",
										)}
										rel="noopener noreferrer"
									>
										{section.title}
										{section.link && (
											<span className="ml-2 text-slate-700">
												<ExternalLink className="inline size-4" />
											</span>
										)}
									</a>
								</h2>
								<p className="leading-7 text-slate-600">{section.description}</p>

								{/* Piaget Table */}
								{section.details && (
									<div className="mt-4 space-y-3">
										<div className="overflow-hidden rounded-[20px] border border-slate-200">
											<table className="w-full text-sm">
												<thead className="bg-slate-50">
													<tr>
														<th className="px-4 py-3 text-left font-medium text-slate-700">Usia</th>
														<th className="px-4 py-3 text-left font-medium text-slate-700">
															Tahap
														</th>
														<th className="px-4 py-3 text-left font-medium text-slate-700">
															Implikasi
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-slate-200">
													{section.details.map((detail) => (
														<tr key={detail.age} className="bg-white">
															<td className="px-4 py-3 text-slate-900">{detail.age}</td>
															<td className="px-4 py-3 text-slate-700">{detail.stage}</td>
															<td className="px-4 py-3 text-slate-600">{detail.implication}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
										<p className="text-sm text-slate-500">
											Contoh: Buku gambar untuk usia 3-5 tahun sering terinspirasi oleh
											<strong> pengulangan dan struktur yang dapat diprediksi</strong> karena anak
											di rentang usia ini biasanya terbantu oleh pengenalan pola.
										</p>
									</div>
								)}

								{/* Vygotsky Points */}
								{section.points && (
									<ul className="mt-3 space-y-2">
										{section.points.map((point) => (
											<li key={point} className="flex items-start gap-2 text-slate-600">
												<span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500" />
												{point}
											</li>
										))}
									</ul>
								)}

								{/* Narrative Steps */}
								{section.steps && (
									<div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{section.steps.map((step, i) => (
											<div
												key={step}
												className="flex items-center gap-3 rounded-[16px] bg-slate-50 px-4 py-3"
											>
												<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-medium text-white">
													{i + 1}
												</span>
												<span className="text-slate-700">{step}</span>
											</div>
										))}
									</div>
								)}

								{/* Image-Text Types */}
								{section.types && (
									<div className="mt-4 grid gap-3 sm:grid-cols-2">
										{section.types.map((t) => (
											<div
												key={t.type}
												className="rounded-[16px] border border-slate-200 bg-white px-4 py-3"
											>
												<p className="font-medium text-slate-900">{t.type}</p>
												<p className="text-slate-600">{t.desc}</p>
											</div>
										))}
									</div>
								)}

								{/* Moral Features */}
								{section.features && (
									<div className="mt-3 flex flex-wrap gap-2">
										{section.features.map((feature) => (
											<span
												key={feature}
												className="rounded-full bg-sky-100 text-sm px-3 py-1.5 text-sky-700"
											>
												{feature}
											</span>
										))}
									</div>
								)}
							</div>
						</div>
					</motion.section>
				))}
			</div>

			{/* CTA */}
			<motion.section
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.6 }}
				className="rounded-[28px] border border-slate-900/5 bg-slate-900 px-8 py-8 text-center text-white shadow-[0_28px_90px_rgba(15,23,42,0.22)]"
			>
				<p className="font-heading text-2xl">Siap membuat cerita untuk buat hati Anda sendiri?</p>
				<Button
					asChild
					size="lg"
					className="mt-6 rounded-full bg-white px-7 text-slate-900 shadow-lg hover:bg-slate-100"
				>
					<Link to="/create">Buat Cerita Sekarang</Link>
				</Button>
			</motion.section>
		</div>
	);
}
