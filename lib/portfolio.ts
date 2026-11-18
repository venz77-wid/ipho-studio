import 'server-only';

import { supabase } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';
import { STUDIO_BUCKET } from './studioContentData';
import { PORTFOLIO_DEFAULTS, type PortfolioCategory, type PortfolioContent, type PortfolioPackage, type PortfolioPhoto, type PortfolioSnapshot } from './portfolioTypes';

// Rasio kartu mengikuti orientasi foto paket yang tersedia di Storage.
const PHOTO_RATIOS: Record<string, string> = {
    'graduation-solo-editorial': '3 / 2',
    'graduation-with-family': '3 / 2',
    'couple-prewedding-intimate': '3 / 2',
    'family-portrait-grand': '3 / 2',
    'corporate-commercial-headshot': '3 / 4',
    'maternity-newborn-studio': '4 / 5',
    'self-photo-studio-basic': '4 / 5',
    'self-photo-studio-unlimited': '2 / 3',
};

const GALLERY_ORDER = [
    'graduation-solo-editorial',
    'couple-prewedding-intimate',
    'self-photo-studio-basic',
    'corporate-commercial-headshot',
    'graduation-with-family',
    'self-photo-studio-unlimited',
    'family-portrait-grand',
    'maternity-newborn-studio',
];

export async function getPortfolioCatalog(): Promise<{ categories: PortfolioCategory[]; packages: PortfolioPackage[] }> {
    const [categories, packages] = await Promise.all([
        supabase.from('categories').select('id, slug, name').order('sort_order'),
        supabase.from('packages')
            .select('id, slug, title, category_id, image_path, image_position')
            .eq('is_active', true)
            .not('image_path', 'is', null)
            .order('sort_order')
            .order('slug'),
    ]);

    if (categories.error || packages.error) {
        throw new Error('Gagal memuat galeri portofolio.');
    }

    const order = new Map(GALLERY_ORDER.map((slug, index) => [slug, index]));
    const photos = (packages.data ?? []).flatMap((item) => {
        const src = item.image_path?.trim();
        if (!src) return [];

        return [{
            id: item.id,
            slug: item.slug,
            title: item.title,
            categoryId: item.category_id,
            src,
            position: item.image_position?.trim() || 'center',
            aspectRatio: PHOTO_RATIOS[item.slug] ?? '4 / 5',
        }];
    });

    photos.sort((a, b) =>
        (order.get(a.slug) ?? GALLERY_ORDER.length) - (order.get(b.slug) ?? GALLERY_ORDER.length),
    );

    return { categories: categories.data ?? [], packages: photos };
}

export function initialPortfolio(packages: PortfolioPackage[]): PortfolioContent {
    return {
        ...PORTFOLIO_DEFAULTS,
        photos: packages.map((photo) => ({
            id: photo.id,
            title: photo.title,
            alt: photo.title,
            categoryId: photo.categoryId,
            visible: true,
            position: photo.position,
            aspectRatio: photo.aspectRatio,
            source: { kind: 'package', packageId: photo.id, label: photo.title, src: photo.src },
        })),
    };
}

export async function loadPortfolioSnapshot() {
    const { data, error } = await supabaseAdmin.from('studio_portfolio')
        .select('content,revision,published_at').eq('id', 1).maybeSingle();
    if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') return null;
        throw new Error('Gagal memuat publikasi portofolio.');
    }
    if (!data) return null;
    return { content: data.content as PortfolioContent | null, revision: data.revision as number, publishedAt: data.published_at as string | null };
}

export function portfolioSnapshot(
    saved: Awaited<ReturnType<typeof loadPortfolioSnapshot>>,
    packages: PortfolioPackage[],
): PortfolioSnapshot {
    return {
        content: saved?.content ?? initialPortfolio(packages),
        revision: saved?.revision ?? 0,
        publishedAt: saved?.publishedAt ?? null,
    };
}

export function portfolioPhotoUrl(photo: PortfolioPhoto) {
    return photo.source.kind === 'package'
        ? photo.source.src
        : supabaseAdmin.storage.from(STUDIO_BUCKET).getPublicUrl(photo.source.path).data.publicUrl;
}
