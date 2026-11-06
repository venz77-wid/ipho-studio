'use client';

import { useRouter } from 'next/navigation';

export default function ScheduleError({ reset }: { reset: () => void }) {
    const router = useRouter();
    return (
        <main style={{ padding: 32 }}>
            <h2>Jadwal belum bisa dimuat</h2>
            <p>Periksa koneksi ke database, lalu coba muat ulang.</p>
            <button type="button" onClick={() => { router.refresh(); reset(); }}>Coba lagi</button>
        </main>
    );
}
