import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FACILITY_ICONS, STUDIO_TEXT, type Facility, type StudioContent, type StudioTextKey } from '@/lib/studioContent';
import { STUDIO_BUCKET, studioPhotoUrl } from '@/lib/studioContentData';
import { normalizeWhatsApp } from '@/lib/adminBookingOperations';

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const MAX_PHOTO = 8 * 1024 * 1024;

function allowedUrl(value: string, hosts: string[], pathPrefix?: string) {
    if (!value) return true;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password &&
            !url.port && hosts.includes(url.hostname) && (!pathPrefix || url.pathname.startsWith(pathPrefix));
    } catch {
        return false;
    }
}

function readContent(raw: Record<string, unknown>): Omit<StudioContent, 'photoPath'> {
    const text = {} as typeof STUDIO_TEXT;
    for (const key of Object.keys(STUDIO_TEXT) as StudioTextKey[]) {
        const value = raw[key];
        const max = key === 'about' ? 4000 : 1000;
        if (typeof value !== 'string' || value.length > max) throw new Error(`Isian ${key} tidak valid.`);
        text[key] = value.trim();
    }
    if (!text.title || !text.intro || !text.about || !text.address || !text.whatsapp || !text.bookingTitle) {
        throw new Error('Lengkapi judul, pengantar, cerita studio, alamat, WhatsApp, dan judul ajakan booking.');
    }
    if (!/^\+?[0-9 ()-]{8,25}$/.test(text.whatsapp)) throw new Error('Nomor WhatsApp tidak valid.');
    text.whatsapp = normalizeWhatsApp(text.whatsapp);
    if (!/^62\d{8,13}$/.test(text.whatsapp)) throw new Error('Gunakan nomor WhatsApp Indonesia yang valid.');
    if (text.phone && !/^\+?[0-9 ()-]{6,25}$/.test(text.phone)) throw new Error('Nomor telepon tidak valid.');
    if (text.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.email)) throw new Error('Alamat email tidak valid.');
    if (!allowedUrl(text.maps, ['maps.app.goo.gl', 'maps.google.com', 'maps.google.co.id']) &&
        !allowedUrl(text.maps, ['google.com', 'www.google.com', 'google.co.id', 'www.google.co.id'], '/maps')) {
        throw new Error('Masukkan tautan HTTPS Google Maps.');
    }
    if (!allowedUrl(text.instagram, ['instagram.com', 'www.instagram.com']) ||
        !allowedUrl(text.tiktok, ['tiktok.com', 'www.tiktok.com'])) throw new Error('Periksa tautan media sosial.');

    if (!Array.isArray(raw.facilities) || raw.facilities.length > 40 ||
        !Array.isArray(raw.faqs) || raw.faqs.length > 40) throw new Error('Fasilitas atau FAQ tidak valid.');

    const itemText = (value: unknown, max: number, required: boolean) => {
        if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
            throw new Error('Periksa nama, deskripsi, atau isi FAQ.');
        }
        return value.trim();
    };
    const facilities = raw.facilities.map((item) => {
        if (!item || !Object.hasOwn(FACILITY_ICONS, item.icon) || typeof item.visible !== 'boolean') {
            throw new Error('Periksa ikon dan status fasilitas.');
        }
        return {
            icon: item.icon as Facility['icon'], visible: item.visible,
            name: itemText(item.name, 100, true), label: itemText(item.label, 80, false),
            description: itemText(item.description, 500, item.visible),
        };
    });
    const faqs = raw.faqs.map((item) => {
        if (!item || typeof item.visible !== 'boolean') throw new Error('Periksa status FAQ.');
        return {
            visible: item.visible,
            question: itemText(item.question, 200, true), answer: itemText(item.answer, 2000, item.visible),
        };
    });
    return { ...text, facilities, faqs };
}

function imageExtension(bytes: Uint8Array, type: string) {
    const matches = (offset: number, signature: number[]) => signature.every((n, i) => bytes[offset + i] === n);
    if (type === 'image/jpeg' && matches(0, [255, 216, 255])) return 'jpg';
    if (type === 'image/png' && matches(0, [137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
    if (type === 'image/webp' && matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80])) return 'webp';
    return null;
}

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);
    if (req.headers.get('origin') !== new URL(req.url).origin &&
        req.headers.get('sec-fetch-site') !== 'same-origin') return fail(403, 'Asal permintaan tidak valid.');
    if (Number(req.headers.get('content-length')) > MAX_PHOTO + 512 * 1024) return fail(413, 'Permintaan terlalu besar.');

    const form = await req.formData().catch(() => null);
    if (!form) return fail(400, 'Formulir tidak dapat dibaca.');
    const raw = form.get('content');
    const revision = form.get('revision');
    const action = form.get('photoAction');
    if (typeof raw !== 'string' || raw.length > 160_000 || typeof revision !== 'string' ||
        !/^\d{1,9}$/.test(revision) || !['keep', 'replace', 'remove'].includes(String(action))) {
        return fail(400, 'Data publikasi tidak valid.');
    }

    let fields: Omit<StudioContent, 'photoPath'>;
    try {
        fields = readContent(JSON.parse(raw));
    } catch (error) {
        return fail(400, error instanceof Error ? error.message : 'Periksa isian formulir.');
    }

    const { data: previous, error: readError } = await supabaseAdmin.from('studio_site_content')
        .select('revision,content').eq('id', 1).single();
    if (readError) return fail(503, 'Konten belum dapat dimuat. Periksa pemasangan SQL.');
    if (previous.revision !== Number(revision)) return fail(409, 'Konten sudah diperbarui. Muat ulang sebelum menerbitkan.');

    const storage = supabaseAdmin.storage.from(STUDIO_BUCKET);
    let newPath: string | null = null;
    let photoPath = action === 'keep' ? previous.content.photoPath ?? null : null;
    if ((photoPath || action === 'replace') && !fields.photoAlt) return fail(400, 'Isi teks alternatif foto utama.');

    if (action === 'replace') {
        const file = form.get('photo');
        if (!(file instanceof File) || !file.size || file.size > MAX_PHOTO) {
            return fail(400, 'Pilih foto berukuran maksimal 8 MB.');
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const extension = imageExtension(bytes, file.type);
        if (!extension) return fail(400, 'Gunakan foto JPG, PNG, atau WebP yang valid.');
        newPath = `about/${crypto.randomUUID()}.${extension}`;
        const { error } = await storage.upload(newPath, bytes, { contentType: file.type, cacheControl: '3600' });
        if (error) return fail(500, 'Foto belum dapat diunggah. Coba lagi.');
        photoPath = newPath;
    }
    const content: StudioContent = { ...fields, photoPath };
    const publishedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('studio_site_content')
        .update({ content, revision: previous.revision + 1, published_at: publishedAt, published_by: auth.userId })
        .eq('id', 1).eq('revision', previous.revision).select('revision').maybeSingle();
    if (error) return fail(500, 'Publikasi belum dapat dikonfirmasi. Coba lagi atau periksa halaman website.');
    if (!data) {
        if (newPath) await storage.remove([newPath]);
        return fail(409, 'Konten sudah diperbarui. Muat ulang sebelum menerbitkan.');
    }
    return NextResponse.json({ content, revision: data.revision, publishedAt, photoUrl: studioPhotoUrl(photoPath) });
}
