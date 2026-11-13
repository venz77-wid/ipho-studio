import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ADMIN_PACKAGE_FIELDS, adminPackage, PACKAGE_BUCKET } from '@/lib/adminCatalogData';
import { CAPACITY_OPTIONS, CATALOG_PHOTO_LIMIT } from '@/lib/adminCatalogTypes';

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

async function authorize(request: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);
    if (request.headers.get('sec-fetch-site') !== 'same-origin' &&
        request.headers.get('origin') !== new URL(request.url).origin) return fail(403, 'Asal permintaan tidak valid.');
    return null;
}

function textField(value: unknown, name: string, max: number, required = true) {
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
        throw new Error(`Periksa isian ${name}.`);
    }
    return value.trim();
}

function packageFields(raw: Record<string, unknown>) {
    if (typeof raw.categoryId !== 'string' || !uuid.test(raw.categoryId)) throw new Error('Pilih kategori paket.');
    if (typeof raw.price !== 'number' || !Number.isInteger(raw.price) || raw.price <= 0 || raw.price > 2147483647) {
        throw new Error('Harga harus berupa rupiah bulat, minimal Rp1.');
    }
    if (typeof raw.durationMinutes !== 'number' || !Number.isInteger(raw.durationMinutes) ||
        raw.durationMinutes <= 0 || raw.durationMinutes >= 1440) throw new Error('Isi durasi antara 1 dan 1.439 menit.');
    if (!CAPACITY_OPTIONS.some(([value]) => value === raw.capacityIcon)) throw new Error('Pilih ikon kapasitas.');
    if (!Array.isArray(raw.features) || raw.features.length > 30) throw new Error('Maksimal 30 fasilitas per paket.');
    if (typeof raw.active !== 'boolean' || typeof raw.featured !== 'boolean') throw new Error('Periksa status paket.');
    if (typeof raw.imagePosition !== 'string' ||
        !/^(?:center|center (?:100|[0-9]{1,2})%)$/.test(raw.imagePosition)) throw new Error('Periksa posisi foto.');
    return {
        title: textField(raw.title, 'nama paket', 120),
        description: textField(raw.description, 'deskripsi', 200, false),
        category_id: raw.categoryId,
        price: raw.price,
        duration_minutes: raw.durationMinutes,
        price_unit: textField(raw.priceUnit, 'satuan harga', 40),
        capacity_label: textField(raw.capacityLabel, 'kapasitas', 160),
        capacity_icon: raw.capacityIcon,
        features: raw.features.map((item: unknown) => textField(item, 'fasilitas', 240)),
        label: textField(raw.label, 'label foto', 60, false),
        badge: textField(raw.badge ?? '', 'badge', 60, false) || null,
        image_position: raw.imagePosition,
        is_active: raw.active,
        is_featured: raw.featured,
    };
}

function imageExtension(bytes: Uint8Array, mime: string) {
    const matches = (offset: number, signature: number[]) => signature.every((value, i) => bytes[offset + i] === value);
    if (mime === 'image/jpeg' && matches(0, [255, 216, 255])) return 'jpg';
    if (mime === 'image/png' && matches(0, [137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
    if (mime === 'image/webp' && matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80])) return 'webp';
    return null;
}

export async function POST(request: Request) {
    const denied = await authorize(request);
    if (denied) return denied;
    if (Number(request.headers.get('content-length')) > CATALOG_PHOTO_LIMIT + 96_000) return fail(413, 'Ukuran foto maksimal 5 MB.');

    const form = await request.formData().catch(() => null);
    const content = form?.get('package');
    const id = form?.get('id') ?? null;
    if (typeof content !== 'string' || content.length > 64_000 ||
        (id !== null && (typeof id !== 'string' || !uuid.test(id)))) return fail(400, 'Data paket tidak valid.');

    let fields: ReturnType<typeof packageFields>;
    try {
        fields = packageFields(JSON.parse(content));
    } catch (error) {
        return fail(400, error instanceof Error ? error.message : 'Periksa isian paket.');
    }

    const { data: category, error: categoryError } = await supabaseAdmin.from('categories')
        .select('id,name').eq('id', fields.category_id).maybeSingle();
    if (categoryError) return fail(502, 'Kategori belum dapat diperiksa.');
    if (!category) return fail(400, 'Kategori paket sudah tidak tersedia.');
    if (!fields.label) fields.label = category.name;

    const packageId = id ?? crypto.randomUUID();
    let sortOrder = 0;
    if (id) {
        const { data, error } = await supabaseAdmin.from('packages').select('id').eq('id', id).maybeSingle();
        if (error) return fail(502, 'Paket belum dapat diperiksa.');
        if (!data) return fail(404, 'Paket sudah tidak tersedia.');
    } else {
        const { data, error } = await supabaseAdmin.from('packages').select('sort_order')
            .order('sort_order', { ascending: false }).limit(1).maybeSingle();
        if (error) return fail(502, 'Urutan paket belum dapat dimuat.');
        sortOrder = (data?.sort_order ?? 0) + 1;
    }

    const storage = supabaseAdmin.storage.from(PACKAGE_BUCKET);
    let path: string | null = null;
    const file = form?.get('photo');
    if (file != null) {
        if (!(file instanceof File) || file.size === 0 || file.size > CATALOG_PHOTO_LIMIT) {
            return fail(400, 'Pilih foto dengan ukuran maksimal 5 MB.');
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const extension = imageExtension(bytes, file.type);
        if (!extension) return fail(400, 'Gunakan foto JPG, PNG, atau WebP yang valid.');
        path = `catalog/${packageId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await storage.upload(path, bytes, { contentType: file.type, cacheControl: '3600', upsert: false });
        if (error) return fail(502, 'Foto belum dapat diunggah. Coba lagi.');
    }

    const payload = { ...fields, ...(path ? { image_path: storage.getPublicUrl(path).data.publicUrl } : {}) };
    const table = supabaseAdmin.from('packages');
    // Slug paket lama dipertahankan agar tautan pemesanan tetap berlaku.
    const slug = fields.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
    const write = id ? table.update(payload).eq('id', id) : table.insert({
        ...payload, id: packageId, slug: `${slug || 'paket'}-${packageId}`, sort_order: sortOrder,
    });
    const { data, error } = await write.select(ADMIN_PACKAGE_FIELDS).maybeSingle();
    if (error || !data) {
        // Jika server tidak memastikan hasil tulis, pertahankan objek agar paket yang mungkin sudah tersimpan tetap bisa menampilkan foto.
        if (path && (!error || /^[0-9A-Z]{5}$/.test(error.code))) await storage.remove([path]).catch(() => null);
        return fail(error ? 502 : 404, error ? 'Penyimpanan belum dapat dikonfirmasi. Periksa daftar paket sebelum mencoba lagi.' : 'Paket sudah tidak tersedia.');
    }

    return NextResponse.json({ package: adminPackage(data) }, { status: id ? 200 : 201 });
}

export async function PATCH(request: Request) {
    const denied = await authorize(request);
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    if (!body || typeof body.id !== 'string' || !uuid.test(body.id) || typeof body.active !== 'boolean') {
        return fail(400, 'Status paket tidak valid.');
    }
    const { data, error } = await supabaseAdmin.from('packages').update({ is_active: body.active })
        .eq('id', body.id).select(ADMIN_PACKAGE_FIELDS).maybeSingle();
    if (error) return fail(502, 'Status belum dapat disimpan.');
    if (!data) return fail(404, 'Paket sudah tidak tersedia.');
    return NextResponse.json({ package: adminPackage(data) });
}

export async function PUT(request: Request) {
    const denied = await authorize(request);
    if (denied) return denied;
    const body = await request.json().catch(() => null);
    const valid = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 5000 &&
        value.every((item) => typeof item === 'string' && uuid.test(item)) && new Set(value).size === value.length;
    if (!valid(body?.expected) || !valid(body?.desired) || body.expected.length !== body.desired.length) {
        return fail(400, 'Urutan paket tidak valid.');
    }
    const { data, error } = await supabaseAdmin.rpc('set_studio_package_order', { expected: body.expected, desired: body.desired });
    if (error?.code === 'PGRST202') return fail(503, 'Jalankan setup-catalog-order.sql untuk mengaktifkan penyimpanan urutan.');
    if (error) return fail(502, 'Urutan paket belum dapat disimpan.');
    if (!data) return fail(409, 'Daftar paket sudah berubah. Muat ulang halaman sebelum mengatur urutan.');
    return NextResponse.json({ ok: true });
}
