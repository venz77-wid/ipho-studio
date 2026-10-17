// Tipe & mock data. Ganti isi fungsi get...() dengan fetch Supabase.
// Contoh: const { data } = await supabase.from('packages').select('*').eq('is_featured', true).order('sort_order');

export interface PhotoPackage {
    id: string;
    durationLabel: string; // "30 Menit"
    category: string; // "SELF SHOOT"
    title: string;
    price: number; // Rupiah
    priceUnit: string; // "sesi"
    features: string[];
    isPopular: boolean;
    /** Path di /public, contoh: /images/packages/package-1.jpg */
    imageSrc: string;
    imageAlt: string;
}

export interface GalleryImage {
    id: string;
    src: string;
    alt: string;
}

export interface StudioFeature {
    id: string;
    label: string;
    icon: 'sun' | 'zap' | 'shirt' | 'camera';
}

export const photoPackages: PhotoPackage[] = [
    {
        id: 'pkg-1',
        durationLabel: '30 Menit',
        category: 'SELF SHOOT',
        title: 'Self Portrait Express',
        price: 150000,
        priceUnit: 'sesi',
        features: [
            'Unlimited Shutter (30 Menit)',
            'Semua file digital (Google Drive)',
            '2 Cetak Foto 4R Premium',
            'Maksimal 2 orang',
        ],
        isPopular: false,
        imageSrc: '/images/packages/solofoto.jpg',
        imageAlt: 'Sesi self portrait di studio',
    },
    {
        id: 'pkg-2',
        durationLabel: '60 Menit',
        category: 'FOTOGRAFER STUDIO',
        title: 'Editorial Portrait & Wisuda',
        price: 450000,
        priceUnit: 'sesi',
        features: [
            'Didampingi fotografer profesional',
            'All original raw preview & jpegs',
            '5 Foto skin retouching halus',
            '1 Cetak 10R + Frame Minimalis',
            'Konsultasi pose & styling',
        ],
        isPopular: true,
        imageSrc: '/images/packages/wisuda.jpg',
        imageAlt: 'Foto wisuda editorial',
    },
    {
        id: 'pkg-3',
        durationLabel: '90 Menit',
        category: 'KELUARGA & SAHABAT',
        title: 'Group & Family Studio',
        price: 650000,
        priceUnit: 'sesi',
        features: [
            'Kapasitas hingga 8 orang',
            '1 Fotografer + 1 Lighting Assistant',
            '8 Foto retouching high-resolution',
            'Bonus Hardcover Mini Photo Album',
        ],
        isPopular: false,
        imageSrc: '/images/packages/fotokeluarga.jpg',
        imageAlt: 'Foto keluarga besar di studio',
    },
    {
        id: 'pkg-4',
        durationLabel: '120 Menit',
        category: 'PREWEDDING EKSKLUSIF',
        title: 'Pre-Wedding Intimate',
        price: 850000,
        priceUnit: 'sesi',
        features: [
            'Sesi 2 Jam santai & leluasa',
            'Bebas ganti hingga 2 kostum',
            '12 Foto fine art editorial retouch',
            '2 Cetak 12R + Floating Frame',
        ],
        isPopular: false,
        imageSrc: '/images/packages/prewedd.jpg',
        imageAlt: 'Sesi pre-wedding intimate',
    },
];

export const galleryImages: GalleryImage[] = [1, 2, 3, 4, 5, 6].map((n) => ({
    id: `gallery-${n}`,
    src: `/images/galeri${n}.jpg`, // public/images/gallery-1.jpg ... gallery-6.jpg
    alt: `Hasil foto studio ${n}`,
}));

export const studioFeatures: StudioFeature[] = [
    { id: 'f1', label: 'Seamless Cyclorama', icon: 'sun' },
    { id: 'f2', label: 'Pro-foto Lighting Kit', icon: 'zap' },
    { id: 'f3', label: 'Private Dressing Room', icon: 'shirt' },
    { id: 'f4', label: 'Instant Live Tethering', icon: 'camera' },
];

// Async agar siap diganti dengan Supabase.
export async function getFeaturedPackages(): Promise<PhotoPackage[]> {
    return photoPackages;
}
export async function getGalleryImages(): Promise<GalleryImage[]> {
    return galleryImages;
}
export async function getStudioFeatures(): Promise<StudioFeature[]> {
    return studioFeatures;
}