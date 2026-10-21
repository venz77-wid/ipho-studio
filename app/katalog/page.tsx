import Link from 'next/link';
import {
    Aperture, Banknote, CalendarClock, ChevronLeft, ChevronRight,
    Headset, MessageSquare, Timer,
} from 'lucide-react';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import CatalogCard from '@/components/CatalogCard/CatalogCard';
import CatalogToolbar from '@/components/CatalogToolbar/CatalogToolbar';
import { getCatalogPackages, getCategoryOptions } from '@/lib/packages';
import { PAGE_SIZE, SORT_OPTIONS, buildCatalogHref, type SortKey } from '@/lib/catalogTypes';
import styles from './page.module.css';

type SearchParams = Record<string, string | string[] | undefined>;

interface KatalogPageProps {
    searchParams: Promise<SearchParams>;
}

const first = (v: string | string[] | undefined): string =>
    (Array.isArray(v) ? v[0] : v) ?? '';

export const metadata = {
    title: 'Katalog Paket | IPHO STUDIO',
    description: 'Daftar paket foto studio IPHO: self-photo, wisuda, couple, keluarga, dan komersial.',
};

const RULES = [
    {
        icon: CalendarClock,
        title: 'Kebijakan Reschedule',
        text: 'Perubahan jadwal sesi foto gratis maksimal 1 kali dengan pemberitahuan minimal 48 jam sebelum sesi dimulai via portal booking atau WhatsApp CS.',
    },
    {
        icon: Banknote,
        title: 'Ketentuan DP 30%',
        text: 'Slot kalender otomatis terkunci setelah konfirmasi. Deposit sebesar 30% dari total paket. Pelunasan sisa tagihan dapat diselesaikan di kasir studio setelah pemotretan.',
    },
    {
        icon: Timer,
        title: 'Waktu Kedatangan',
        text: 'Harap hadir 15 menit lebih awal untuk persiapan tata rias dan briefing konsep. Keterlambatan kedatangan akan mengurangi durasi waktu pemotretan yang telah dipesan.',
    },
];

export default async function KatalogPage({
    searchParams,
}: KatalogPageProps): Promise<React.JSX.Element> {
    const sp = await searchParams;
    const q = first(sp.q).trim();
    const category = first(sp.kategori);
    const sortRaw = first(sp.urut);
    const sort: SortKey = SORT_OPTIONS.some((o) => o.value === sortRaw)
        ? (sortRaw as SortKey)
        : 'rekomendasi';
    const page = Math.max(1, parseInt(first(sp.hal), 10) || 1);

    const [result, { categories, totalActive }] = await Promise.all([
        getCatalogPackages({ q, category, sort, page }),
        getCategoryOptions(),
    ]);

    const start = result.total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1;
    const end = start === 0 ? 0 : start + result.items.length - 1;
    const href = (p: number): string => buildCatalogHref({ q, category, sort, page: p });

    return (
        <>
            <Navbar />
            <main className={styles.main}>
                <section className={styles.list}>
                    <div className={styles.container}>
                        <nav className={styles.crumb} aria-label="Breadcrumb">
                            <Link href="/">Beranda</Link> <span aria-hidden>›</span>{' '}
                            <strong>Katalog Paket</strong>
                        </nav>

                        <div className={styles.head}>
                            <div>
                                <span className={styles.eyebrow}>PILIHAN SESI &amp; TARIF</span>
                                <h1 className={styles.h1}>Daftar Paket Foto</h1>
                                <p className={styles.lead}>
                                    Temukan sesi pemotretan yang sesuai dengan kebutuhan Anda. Dari potret mandiri
                                    hingga sesi keluarga dan komersial dengan peralatan studio standar internasional.
                                </p>
                            </div>
                            <span className={styles.gear}>
                                <Aperture size={14} aria-hidden /> Lensa &amp; Lighting Profoto Pro-11 Terkalibrasi
                            </span>
                        </div>

                        <CatalogToolbar
                            categories={categories}
                            totalActive={totalActive}
                            q={q}
                            category={category}
                            sort={sort}
                        />

                        <div className={styles.meta}>
                            <span>
                                Menampilkan <strong>{result.items.length} dari {totalActive}</strong> paket aktif
                                dalam ketersediaan studio bulan ini
                            </span>
                            <span className={styles.live}>
                                <i aria-hidden /> Kalender Studio Real-time Buka
                            </span>
                        </div>

                        {result.items.length === 0 ? (
                            <div className={styles.empty}>
                                <p>Tidak ada paket yang cocok dengan pencarian Anda.</p>
                                <Link href="/katalog">Reset filter</Link>
                            </div>
                        ) : (
                            <div className={styles.grid}>
                                {result.items.map((p) => (
                                    <CatalogCard key={p.id} data={p} />
                                ))}
                            </div>
                        )}

                        {result.total > 0 && (
                            <div className={styles.pagination}>
                                <span>
                                    Menampilkan <strong>{start} - {end}</strong> dari <strong>{result.total}</strong> paket
                                </span>
                                {result.totalPages > 1 && (
                                    <nav className={styles.pages} aria-label="Halaman">
                                        {result.page > 1 ? (
                                            <Link href={href(result.page - 1)} aria-label="Sebelumnya"><ChevronLeft size={14} /></Link>
                                        ) : (
                                            <span className={styles.disabled}><ChevronLeft size={14} /></span>
                                        )}
                                        {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => (
                                            <Link
                                                key={n}
                                                href={href(n)}
                                                aria-current={n === result.page ? 'page' : undefined}
                                                className={n === result.page ? styles.current : undefined}
                                            >
                                                {n}
                                            </Link>
                                        ))}
                                        {result.page < result.totalPages ? (
                                            <Link href={href(result.page + 1)} aria-label="Berikutnya"><ChevronRight size={14} /></Link>
                                        ) : (
                                            <span className={styles.disabled}><ChevronRight size={14} /></span>
                                        )}
                                    </nav>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                <section className={styles.info}>
                    <div className={styles.container}>
                        <div className={styles.infoHead}>
                            <div>
                                <span className={styles.eyebrow}>INFORMASI PENTING</span>
                                <h2 className={styles.h2}>Ketentuan &amp; Panduan Sesi</h2>
                            </div>
                            <p>
                                Transparansi tanpa biaya tersembunyi. Pelajari aturan penjadwalan dan kedatangan
                                studio demi kelancaran sesi Anda.
                            </p>
                        </div>

                        <div className={styles.rules}>
                            {RULES.map(({ icon: Icon, title, text }) => (
                                <div key={title} className={styles.rule}>
                                    <span className={styles.ruleIcon}><Icon size={16} aria-hidden /></span>
                                    <h3>{title}</h3>
                                    <p>{text}</p>
                                </div>
                            ))}
                        </div>

                        <div className={styles.cta}>
                            <span className={styles.ctaIcon}><Headset size={20} aria-hidden /></span>
                            <div className={styles.ctaText}>
                                <h3>Butuh konsep kustom atau sewa studio per jam kosong?</h3>
                                <p>Hubungi tim produksi kami untuk penawaran komersial skala besar.</p>
                            </div>
                            <a href="https://wa.me/" target="_blank" rel="noreferrer" className={styles.ctaBtn}>
                                <MessageSquare size={14} aria-hidden /> Konsultasi Bebas Biaya
                            </a>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}