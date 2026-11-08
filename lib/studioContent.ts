export const FACILITY_ICONS = {
    snow: 'AC',
    shirt: 'Ruang ganti',
    palette: 'Backdrop',
    armchair: 'Properti',
    parking: 'Parkir',
    camera: 'Studio',
} as const;

export type Facility = {
    icon: keyof typeof FACILITY_ICONS;
    name: string;
    description: string;
    label: string;
    visible: boolean;
};

export type Faq = { question: string; answer: string; visible: boolean };

export const STUDIO_TEXT = {
    title: 'Kenali IPHO Studio',
    intro: 'Ruang dokumentasi visual di Berau untuk mengabadikan momen pribadi, wisuda, dan keluarga.',
    photoCaption: '',
    photoAlt: '',
    about: ['IPHO Studio melayani sesi foto di Berau, Kalimantan Timur. Kami menyiapkan ruang untuk mengabadikan momen pribadi maupun kebersamaan.', 'Jelajahi katalog untuk membandingkan pilihan paket foto personal, wisuda, pasangan, dan keluarga. Hubungi admin jika ingin membahas konsep atau kebutuhan khusus sebelum memesan.'].join('\n\n'),
    address: 'Jl. DR. Murjani II No. 107, Karang Ambun, Kec. Tanjung Redeb, Kabupaten Berau, Kalimantan Timur 77315',
    directions: '',
    maps: 'https://maps.app.goo.gl/AcKSFqYZDP5EfLNu7?g_st=ic',
    contactTitle: 'Punya Pertanyaan?',
    contactIntro: 'Konsultasikan konsep foto, pilihan paket, atau ketersediaan jadwal bersama admin studio.',
    contactCardTitle: 'Konsultasi Personal Admin',
    contactDescription: 'Ceritakan konsep foto dan kebutuhanmu agar admin dapat membantu memilih paket dan jadwal sesi.',
    whatsapp: '628115416611',
    phone: '(0554) 2034630',
    email: '',
    serviceHours: '',
    instagram: '',
    tiktok: '',
    bookingTitle: 'Sudah siap untuk sesi fotomu?',
    bookingDescription: 'Temukan paket yang sesuai dengan kebutuhan dokumentasimu dan pilih waktu sesi yang tersedia.',
};

export type StudioTextKey = keyof typeof STUDIO_TEXT;
export type StudioContent = typeof STUDIO_TEXT & {
    photoPath: string | null;
    facilities: Facility[];
    faqs: Faq[];
};

export const DEFAULT_STUDIO_CONTENT: StudioContent = {
    ...STUDIO_TEXT,
    photoPath: null,
    facilities: [
        { icon: 'snow', name: 'Ruang Ber-AC', description: 'Tanyakan pilihan ruang ber-AC untuk sesi fotomu.', label: 'Kenyamanan studio', visible: true },
        { icon: 'shirt', name: 'Ruang Ganti & MUA', description: 'Konfirmasi ruang ganti dan kebutuhan persiapan bersama admin.', label: 'Area persiapan', visible: true },
        { icon: 'palette', name: 'Pilihan Backdrop', description: 'Konsultasikan pilihan latar yang sesuai dengan konsep foto.', label: 'Koleksi visual', visible: true },
        { icon: 'armchair', name: 'Properti Foto', description: 'Tanyakan properti yang tersedia untuk mendukung sesi.', label: 'Elemen komposisi', visible: true },
        { icon: 'parking', name: 'Area Parkir', description: 'Hubungi admin untuk informasi akses dan parkir sebelum berkunjung.', label: 'Aksesibilitas', visible: true },
    ],
    faqs: [
        {
            question: 'Bagaimana cara booking?',
            answer: 'Buka Katalog Paket, pilih paket dan jadwal yang tersedia, lalu lengkapi data dan pembayaran.',
            visible: true,
        },
        {
            question: 'Apakah bisa reschedule jadwal?',
            answer: 'Hubungi admin dengan kode pemesanan dan usulan tanggal baru. Perubahan jadwal mengikuti ketersediaan sesi dan ketentuan pesanan.',
            visible: true,
        },
        {
            question: 'Bagaimana sistem DP dan pelunasan?',
            answer: 'Untuk booking online, kamu bisa memilih DP 30% atau langsung membayar lunas.',
            visible: true,
        },
        {
            question: 'Kapan hasil foto diserahkan?',
            answer: 'Tanyakan estimasi penyerahan hasil foto kepada admin. Waktu pengerjaan mengikuti paket dan layanan yang dipilih.',
            visible: true,
        },
    ],
};

export function studioWhatsApp(number: string) {
    return /^62\d{8,13}$/.test(number) ? `https://wa.me/${number}` : null;
}
