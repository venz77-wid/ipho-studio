import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { loadAdminCatalog } from '@/lib/adminCatalogData';
import AdminCatalog from '@/components/AdminCatalog/AdminCatalog';
import { ArrowUpRight, Camera, Images, Info } from 'lucide-react';
import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import { loadStudioContent } from '@/lib/studioContentData';
import { STUDIO_TIME_ZONE } from '@/lib/scheduleUtils';
import styles from '@/components/StudioContent/StudioEditor.module.css';

const base = '/admin/kelola-website';
const tabs = [
    { key: 'paket', label: 'Katalog Paket', icon: Camera },
    { key: 'portofolio', label: 'Galeri Portofolio', icon: Images },
    { key: 'tentang', label: 'Tentang & Kontak', icon: Info },
] as const;

export default async function ManageWebsitePage({ searchParams }: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const auth = await requireAdmin();
    if (!auth.ok) redirect(auth.status === 401 ? '/login' : '/');
    const { tab } = await searchParams;
    const active = tabs.find(({ key }) => key === tab)?.key ?? 'paket';
    const catalog = active === 'paket' ? await loadAdminCatalog().catch(() => null) : null;
    const site = active === 'tentang' ? await loadStudioContent().catch(() => null) : null;
    const published = site?.publishedAt ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium', timeStyle: 'short', timeZone: STUDIO_TIME_ZONE,
    }).format(new Date(site.publishedAt)) : null;

    return <AdminScheduleShell section="website">
        <div className={styles.editor}>
            <header className={styles.pageHeader}>
                <p className={styles.breadcrumb}>Admin / Kelola Website</p>
                <h1>Kelola Konten Website</h1>
                <p>Atur konten yang dilihat pelanggan IPHO Studio.</p>
            </header>
            <nav className={styles.tabs} aria-label="Bagian Kelola Website">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <Link href={key === 'paket' ? base : `${base}?tab=${key}`} key={key}
                        aria-current={key === active ? 'page' : undefined}>
                        <Icon size={16} /> {label}
                    </Link>
                ))}
            </nav>
            {active === 'paket' && (catalog
                ? <AdminCatalog initial={catalog.packages} categories={catalog.categories} />
                : <section className={styles.card}><h2>Katalog Paket</h2><p role="alert">Daftar paket belum dapat dimuat. Coba muat ulang halaman.</p></section>
            )}
            {active === 'portofolio' && <section className={styles.card}>
                <h2>Galeri Portofolio</h2>
                <p>Pilih foto, atur kategori dan urutan, lalu tinjau sebelum dipublikasikan.</p>
                <div className={styles.row}>
                    <Link className={styles.button} href={`${base}/portofolio`}>Edit Galeri Portofolio</Link>
                    <Link className={styles.button} href="/portofolio">Lihat Halaman <ArrowUpRight size={14} /></Link>
                </div>
            </section>}
            {active === 'tentang' && <section className={styles.card}>
                <h2>Tentang &amp; Kontak</h2>
                <p>Kelola foto utama, profil, fasilitas, lokasi, kontak, dan FAQ.</p>
                {published && <small>Terakhir dipublikasikan {published} WITA</small>}
                <div className={styles.row}>
                    <Link className={styles.button} href={`${base}/tentang`}>Edit Tentang &amp; Kontak</Link>
                    <Link className={styles.button} href="/tentang">Lihat Halaman <ArrowUpRight size={14} /></Link>
                </div>
            </section>}
        </div>
    </AdminScheduleShell>;
}
