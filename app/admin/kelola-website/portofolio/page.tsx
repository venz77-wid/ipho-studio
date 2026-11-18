import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import PortfolioEditor from '@/components/Portfolio/PortfolioEditor';
import { getPortfolioCatalog, loadPortfolioSnapshot, portfolioSnapshot } from '@/lib/portfolio';
import { STUDIO_BUCKET, loadStudioContent } from '@/lib/studioContentData';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_STUDIO_CONTENT, studioWhatsApp } from '@/lib/studioContent';
import styles from '@/components/Portfolio/PortfolioEditor.module.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit Galeri Portofolio | IPHO Studio' };

export default async function AdminPortfolioPage() {
    const auth = await requireAdmin();
    if (!auth.ok) redirect(auth.status === 401 ? '/login' : '/');


    const [catalog, saved, site] = await Promise.all([
        getPortfolioCatalog().catch(() => null),
        loadPortfolioSnapshot().catch(() => undefined),
        loadStudioContent().catch(() => null),
    ]);
    const storageBase = supabaseAdmin.storage.from(STUDIO_BUCKET).getPublicUrl('').data.publicUrl.replace(/\/?$/, '/');

    return (
        <AdminScheduleShell section="website">
            {catalog && saved !== undefined ? (
                <PortfolioEditor
                    initial={portfolioSnapshot(saved, catalog.packages)}
                    categories={catalog.categories}
                    packages={catalog.packages}
                    ready={saved !== null}
                    storageBase={storageBase}
                    chat={studioWhatsApp(site?.content.whatsapp ?? DEFAULT_STUDIO_CONTENT.whatsapp)}
                    previewHeader={<Navbar activePath="/portofolio" />}
                    previewFooter={<Footer />}
                />
            ) : (
                <section className={styles.card}>
                    <h1>Edit Galeri Portofolio</h1>
                    <p role="alert">Data galeri belum dapat dimuat. Periksa koneksi lalu muat ulang halaman.</p>
                    <Link href="/admin/kelola-website?tab=portofolio">Kembali ke Kelola Website</Link>
                </section>
            )}
        </AdminScheduleShell>
    );
}
