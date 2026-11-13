import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { STUDIO_BUCKET } from '@/lib/studioContentData';
import { getPortfolioCatalog, loadPortfolioSnapshot } from '@/lib/portfolio';
import {
    PORTFOLIO_MAX_PHOTOS, PORTFOLIO_RATIOS, PORTFOLIO_UPLOAD_LIMIT,
    type PortfolioContent, type PortfolioPhoto,
} from '@/lib/portfolioTypes';

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const filePath = /^portfolio\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/;
const positionPattern = /^(?:left|center|right|top|bottom|(?:100|[0-9]{1,2})%)(?: (?:left|center|right|top|bottom|(?:100|[0-9]{1,2})%))?$/;

function sameOrigin(req: Request) {
    return req.headers.get('sec-fetch-site') === 'same-origin' ||
        req.headers.get('origin') === new URL(req.url).origin;
}

function imageExtension(bytes: Uint8Array, mime: string) {
    const matches = (offset: number, signature: number[]) =>
        signature.every((byte, i) => bytes[offset + i] === byte);
    if (mime === 'image/jpeg' && matches(0, [255, 216, 255])) return 'jpg';
    if (mime === 'image/png' && matches(0, [137, 80, 78, 71, 13, 10, 26, 10])) return 'png';
    if (mime === 'image/webp' && matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80])) return 'webp';
    return null;
}

export async function POST(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);
    if (!sameOrigin(req)) return fail(403, 'Asal permintaan tidak valid.');
    if (Number(req.headers.get('content-length')) > PORTFOLIO_UPLOAD_LIMIT + 32_000) {
        return fail(413, 'Ukuran foto maksimal 4 MB.');
    }
    const form = await req.formData().catch(() => null);
    const file = form?.get('photo');
    if (!(file instanceof File) || file.size === 0 || file.size > PORTFOLIO_UPLOAD_LIMIT) {
        return fail(400, 'Pilih foto dengan ukuran maksimal 4 MB.');
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = imageExtension(bytes, file.type);
    if (!extension) return fail(400, 'Gunakan foto JPG, PNG, atau WebP yang valid.');

    const path = `portfolio/${auth.userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage.from(STUDIO_BUCKET).upload(path, bytes, {
        contentType: file.type, cacheControl: '3600', upsert: false,
    });
    if (error) return fail(502, 'Foto belum dapat diunggah. Silakan coba lagi.');
    return NextResponse.json({ path });
}

function readText(value: unknown, limit: number) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > limit) {
        throw new Error('Periksa judul, deskripsi, dan teks alternatif foto.');
    }
    return value.trim();
}

export async function PUT(req: Request) {
    const auth = await requireAdmin();
    if (!auth.ok) return fail(auth.status, auth.error);
    if (!sameOrigin(req)) return fail(403, 'Asal permintaan tidak valid.');
    if (Number(req.headers.get('content-length')) > 256_000) return fail(413, 'Data galeri terlalu besar.');
    const body = await req.text().catch(() => '');
    if (body.length > 256_000) return fail(413, 'Data galeri terlalu besar.');
    const raw = (() => { try { return JSON.parse(body); } catch { return null; } })();
    if (!raw || !Number.isSafeInteger(raw.revision) || raw.revision < 0 ||
        !Array.isArray(raw.content?.photos) || raw.content.photos.length > PORTFOLIO_MAX_PHOTOS) {
        return fail(400, 'Data portofolio tidak valid.');
    }

    const [previous, catalog] = await Promise.all([
        loadPortfolioSnapshot().catch(() => null),
        getPortfolioCatalog().catch(() => null),
    ]);
    if (!previous || !catalog) return fail(503, 'Data belum dapat dimuat. Pastikan SQL pemasangan sudah dijalankan.');
    if (previous.revision !== raw.revision) return fail(409, 'Portofolio sudah diperbarui. Muat ulang sebelum publikasi.');

    const ids = new Set<string>();
    const allowedCategories = new Set(catalog.categories.map((category) => category.id));
    const packages = new Map(catalog.packages.map((photo) => [photo.id, photo]));
    const oldPhotos = new Map(previous.content?.photos.map((photo) => [photo.id, photo]));
    const newUploads = new Set<string>();
    let content: PortfolioContent;
    try {
        const photos: PortfolioPhoto[] = raw.content.photos.map((item: PortfolioPhoto) => {
            if (!item || typeof item.id !== 'string' || !uuid.test(item.id) || ids.has(item.id) ||
                !allowedCategories.has(item.categoryId) || typeof item.visible !== 'boolean' ||
                !(PORTFOLIO_RATIOS as readonly string[]).includes(item.aspectRatio) ||
                typeof item.position !== 'string' || !positionPattern.test(item.position) || !item.source) {
                throw new Error('Periksa kategori, rasio, dan posisi foto.');
            }
            ids.add(item.id);
            const old = oldPhotos.get(item.id)?.source;
            let source: PortfolioPhoto['source'];
            if (item.source.kind === 'package') {
                const pack = packages.get(item.source.packageId);
                if (old?.kind === 'package' && old.packageId === item.source.packageId && old.src === item.source.src) {
                    source = old;
                } else if (pack) {
                    source = { kind: 'package', packageId: pack.id, label: pack.title, src: pack.src };
                } else {
                    throw new Error('Foto paket sudah tidak tersedia. Pilih foto lain.');
                }
            } else if (item.source.kind === 'upload' && typeof item.source.path === 'string' && filePath.test(item.source.path)) {
                if (old?.kind !== 'upload' || old.path !== item.source.path) {
                    if (!item.source.path.startsWith(`portfolio/${auth.userId}/`)) throw new Error('Sumber foto tidak valid.');
                    newUploads.add(item.source.path);
                }
                source = { kind: 'upload', path: item.source.path };
            } else {
                throw new Error('Pilih sumber foto yang valid.');
            }
            return {
                id: item.id, title: readText(item.title, 120), alt: readText(item.alt, 240),
                categoryId: item.categoryId, visible: item.visible, aspectRatio: item.aspectRatio,
                position: item.position, source,
            };
        });
        content = { title: readText(raw.content.title, 100), description: readText(raw.content.description, 500), photos };
    } catch (error) {
        return fail(400, error instanceof Error ? error.message : 'Periksa data foto.');
    }
    // Cek bertahap agar batch publikasi tidak membanjiri Storage.
    const storage = supabaseAdmin.storage.from(STUDIO_BUCKET);
    const uploads = [...newUploads];
    for (let i = 0; i < uploads.length; i += 8) {
        const checks = await Promise.all(uploads.slice(i, i + 8).map((path) => storage.exists(path)));
        if (checks.some(({ data, error }) => !data || error)) return fail(400, 'Salah satu foto unggahan belum tersedia.');
    }

    const publishedAt = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from('studio_portfolio')
        .update({ content, revision: previous.revision + 1, published_at: publishedAt, published_by: auth.userId })
        .eq('id', 1).eq('revision', previous.revision).select('revision').maybeSingle();
    if (error) return fail(502, 'Publikasi belum dapat dikonfirmasi. Cek halaman publik sebelum mencoba lagi.');
    if (!data) return fail(409, 'Portofolio sudah diperbarui. Muat ulang sebelum publikasi.');
    return NextResponse.json({ content, revision: data.revision, publishedAt });
}
