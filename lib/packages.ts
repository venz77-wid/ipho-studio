// Query Supabase untuk katalog. Hanya file ini yang bicara ke database.
import { supabase } from './supabaseClient';
import {
    PAGE_SIZE,
    type CapacityIcon,
    type CatalogPackage,
    type CatalogResult,
    type CategoryOption,
    type SortKey,
} from './catalogTypes';
import type { PhotoPackage } from './supabaseMock';

interface PackageRow {
    id: string;
    slug: string;
    label: string;
    badge: string | null;
    title: string;
    description: string;
    capacity_label: string;
    capacity_icon: CapacityIcon;
    duration_minutes: number;
    price: number;
    price_unit: string;
    features: string[];
    image_path: string | null;
    image_position: string;
    is_popular: boolean;
}

const COLUMNS =
    'id, slug, label, badge, title, description, capacity_label, capacity_icon, duration_minutes, price, price_unit, features, image_path, image_position, category:categories!inner(slug)';

const toPackage = (r: PackageRow): CatalogPackage => ({
    id: r.id,
    slug: r.slug,
    label: r.label,
    badge: r.badge,
    title: r.title,
    description: r.description,
    capacityLabel: r.capacity_label,
    capacityIcon: r.capacity_icon,
    durationMinutes: r.duration_minutes,
    price: r.price,
    priceUnit: r.price_unit,
    features: r.features,
    imageSrc: r.image_path,
    imagePosition: r.image_position,
});

export interface CatalogQuery {
    q?: string;
    category?: string;
    sort?: SortKey;
    page?: number;
}

export async function getCatalogPackages({
    q,
    category,
    sort = 'rekomendasi',
    page = 1,
}: CatalogQuery): Promise<CatalogResult> {
    let query = supabase
        .from('packages')
        .select(COLUMNS, { count: 'exact' })
        .eq('is_active', true);

    if (category) query = query.eq('category.slug', category);

    const term = q?.replace(/[,()%*\\]/g, ' ').trim();
    if (term) {
        query = query.or(
            `title.ilike.%${term}%,description.ilike.%${term}%,label.ilike.%${term}%`,
        );
    }

    if (sort === 'termurah') query = query.order('price', { ascending: true });
    else if (sort === 'termahal') query = query.order('price', { ascending: false });
    else query = query.order('sort_order', { ascending: true });

    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);

    // Nomor halaman melebihi data -> kembali ke halaman 1
    if (error?.code === 'PGRST103' && page > 1) {
        return getCatalogPackages({ q, category, sort, page: 1 });
    }
    if (error) throw new Error(`Gagal memuat paket: ${error.message}`);

    const total = count ?? 0;
    return {
        items: ((data ?? []) as unknown as PackageRow[]).map(toPackage),
        total,
        page,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
}

export async function getCategoryOptions(): Promise<{
    categories: CategoryOption[];
    totalActive: number;
}> {
    const [cats, pkgs] = await Promise.all([
        supabase.from('categories').select('slug, name, sort_order').order('sort_order'),
        supabase.from('packages').select('category:categories!inner(slug)').eq('is_active', true),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (pkgs.error) throw new Error(pkgs.error.message);

    const rows = (pkgs.data ?? []) as unknown as { category: { slug: string } | { slug: string }[] }[];
    const counts = new Map<string, number>();
    for (const r of rows) {
        const slug = Array.isArray(r.category) ? r.category[0]?.slug : r.category?.slug;
        if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }

    return {
        categories: (cats.data ?? []).map((c) => ({
            slug: c.slug as string,
            name: c.name as string,
            count: counts.get(c.slug as string) ?? 0,
        })),
        totalActive: rows.length,
    };

}

// Paket favorit untuk Beranda (is_featured = true), maksimal 4
export async function getFeaturedPackages(): Promise<PhotoPackage[]> {
    const { data, error } = await supabase
        .from('packages')
        .select(COLUMNS)
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('sort_order', { ascending: true })
        .limit(4);

    if (error) throw new Error(`Gagal memuat paket favorit: ${error.message}`);

    return ((data ?? []) as unknown as PackageRow[]).map((r) => ({
        id: r.id,
        durationLabel: `${r.duration_minutes} Menit`,
        category: r.label,
        title: r.title,
        price: r.price,
        priceUnit: r.price_unit,
        features: r.features,
        isPopular: r.is_popular,
        imageSrc: r.image_path ?? '/images/packages/placeholder.jpg',
        imageAlt: r.title,
    }));
}