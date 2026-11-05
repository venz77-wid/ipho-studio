import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { authCookieOptions } from '@/lib/auth/cookieOptions';

/**
 * Halaman/API yang boleh dibuka TANPA login.
 * Default (sesuai panduan): kosong = seluruh situs wajib login.
 * Contoh jika katalog dan beranda ingin dibuka untuk umum:
 *   const PUBLIC_PATHS = ['/', '/katalog', '/api/booked-slots'];
 */
const PUBLIC_PATHS: string[] = [];

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Webhook berasal dari server Midtrans (tanpa cookie). Keaslian dicek di route-nya (signature).
    if (path === '/api/payments/notifications') {
        return NextResponse.next({ request });
    }

    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: authCookieOptions,
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(items) {
                    for (const { name, value } of items) {
                        request.cookies.set(name, value);
                    }
                    response = NextResponse.next({ request });
                    for (const { name, value, options } of items) {
                        response.cookies.set(name, value, options);
                    }
                },
            },
        },
    );

    // Memverifikasi pengguna ke Supabase (dan memperbarui token bila perlu)
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    function finish(result: NextResponse) {
        if (result !== response) {
            for (const cookie of response.cookies.getAll()) {
                result.cookies.set(cookie);
            }
        }
        result.headers.set('Cache-Control', 'private, no-store');
        result.headers.set('Pragma', 'no-cache');
        result.headers.set('Expires', '0');
        return result;
    }

    function go(destination: string) {
        const url = request.nextUrl.clone();
        url.pathname = destination;
        url.search = '';
        return finish(NextResponse.redirect(url));
    }

    const isApi = path === '/api' || path.startsWith('/api/');
    const isLogin = path === '/login';
    const isPublic = PUBLIC_PATHS.some((p) =>
        p === '/' ? path === '/' : path === p || path.startsWith(p + '/'),
    );
    const isAdmin =
        path === '/admin' ||
        path.startsWith('/admin/') ||
        path === '/api/admin' ||
        path.startsWith('/api/admin/');

    // Belum login
    if (authError || !user) {
        if (isLogin || (isPublic && !isAdmin)) return finish(response);

        if (isApi) {
            return finish(NextResponse.json({ error: 'Silakan login terlebih dahulu.' }, { status: 401 }));
        }
        return go('/login');
    }

    // Sudah login: baca role dari database
    const { data: profile, error: profileError } = await supabase
        .from('ipho_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profileError || !profile || !['customer', 'admin'].includes(profile.role)) {
        if (isLogin) return finish(response);
        return finish(
            NextResponse.json({ error: 'Profil akun tidak tersedia. Hubungi pengelola.' }, { status: 403 }),
        );
    }

    // Pelanggan tidak boleh masuk area admin
    if (isAdmin && profile.role !== 'admin') {
        if (isApi) {
            return finish(NextResponse.json({ error: 'Akses khusus admin.' }, { status: 403 }));
        }
        return go('/');
    }

    // Sudah login tapi membuka /login -> arahkan sesuai role (POST tetap boleh: itu Server Action)
    if (isLogin && (request.method === 'GET' || request.method === 'HEAD')) {
        return go(profile.role === 'admin' ? '/admin' : '/');
    }

    // Admin membuka beranda -> ke dashboard admin
    if (path === '/' && profile.role === 'admin') {
        return go('/admin');
    }

    return finish(response);
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)',
    ],
};