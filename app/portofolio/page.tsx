import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import PortfolioGallery from '@/components/Portfolio/PortfolioGallery';
import { getPortfolioCatalog, loadPortfolioSnapshot, portfolioPhotoUrl, portfolioSnapshot } from '@/lib/portfolio';
import { PORTFOLIO_DEFAULTS } from '@/lib/portfolioTypes';
import { DEFAULT_STUDIO_CONTENT, studioWhatsApp } from '@/lib/studioContent';
import { loadStudioContent } from '@/lib/studioContentData';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Portofolio | IPHO STUDIO',
    description: 'Jelajahi galeri foto IPHO Studio untuk inspirasi sesi foto Anda.',
};

export default async function PortfolioPage({ searchParams }: {
    searchParams: Promise<{ kategori?: string | string[] }>;
}) {
    const [params, catalog, saved, site] = await Promise.all([
        searchParams,
        getPortfolioCatalog().catch(() => null),
        loadPortfolioSnapshot().catch(() => undefined),
        loadStudioContent().catch(() => null),
    ]);
    const available = !!catalog && saved !== undefined;
    const content = available ? portfolioSnapshot(saved, catalog.packages).content : null;
    const categorySlug = Array.isArray(params.kategori) ? params.kategori[0] : params.kategori;

    return (
        <>
            <Navbar />
            <main>
                <PortfolioGallery
                    title={content?.title ?? PORTFOLIO_DEFAULTS.title}
                    description={content?.description ?? PORTFOLIO_DEFAULTS.description}
                    categories={catalog?.categories ?? []}
                    photos={(content?.photos ?? []).filter((photo) => photo.visible).map((photo) => ({
                        id: photo.id, title: photo.title, alt: photo.alt, categoryId: photo.categoryId,
                        aspectRatio: photo.aspectRatio, position: photo.position, src: portfolioPhotoUrl(photo),
                    }))}
                    categorySlug={categorySlug}
                    chat={studioWhatsApp(site?.content.whatsapp ?? DEFAULT_STUDIO_CONTENT.whatsapp)}
                    unavailable={!available}
                />
            </main>
            <Footer />
        </>
    );
}
