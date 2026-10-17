// Tipe, opsi, dan helper URL katalog (aman dipakai di client maupun server).

export type CapacityIcon = 'user' | 'users' | 'heart' | 'briefcase';
export type SortKey = 'rekomendasi' | 'termurah' | 'termahal';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: 'rekomendasi', label: 'Rekomendasi Utama' },
    { value: 'termurah', label: 'Harga Terendah' },
    { value: 'termahal', label: 'Harga Tertinggi' },
];

export interface CatalogPackage {
    id: string;
    slug: string;
    label: string;
    badge: string | null;
    title: string;
    description: string;
    capacityLabel: string;
    capacityIcon: CapacityIcon;
    durationMinutes: number;
    price: number;
    priceUnit: string;
    features: string[];
    /** Path di /public, mis. /images/packages/solofoto.jpg */
    imageSrc: string | null;
    imagePosition: string;
}

export interface CategoryOption {
    slug: string;
    name: string;
    count: number;
}

export interface CatalogResult {
    items: CatalogPackage[];
    total: number;
    page: number;
    totalPages: number;
}

export const PAGE_SIZE = 8;

export const formatRupiah = (n: number): string =>
    'Rp ' + new Intl.NumberFormat('id-ID').format(n);

interface HrefParams {
    q?: string;
    category?: string;
    sort?: SortKey;
    page?: number;
}

export function buildCatalogHref({ q, category, sort, page }: HrefParams): string {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (category) p.set('kategori', category);
    if (sort && sort !== 'rekomendasi') p.set('urut', sort);
    if (page && page > 1) p.set('hal', String(page));
    const s = p.toString();
    return s ? `/katalog?${s}` : '/katalog';
}