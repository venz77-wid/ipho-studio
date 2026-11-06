'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Printer } from 'lucide-react';
import BlockScheduleModal from '@/components/BlockScheduleModal/BlockScheduleModal';
import type { BlockInput, RoomFilter, StudioRoom } from '@/lib/adminSchedule';

async function changeBlock(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    if (response.ok) return;
    const result = await response.json().catch(() => null);
    throw new Error(result?.error ?? 'Perubahan jadwal gagal. Silakan coba lagi.');
}

export function AddBlockButton({ date, room, rooms, className }: {
    date: string; room: RoomFilter; rooms: StudioRoom[]; className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [notice, setNotice] = useState('');
    const router = useRouter();
    const activeRooms = rooms.filter((item) => item.is_active);

    async function save(input: BlockInput) {
        await changeBlock('/api/admin/schedule-blocks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(input),
        });
        setOpen(false);
        setNotice('Blokir jadwal tersimpan.');
        router.refresh();
    }

    return (
        <div>
            <button type="button" className={className} disabled={!activeRooms.length}
                onClick={() => { setNotice(''); setOpen(true); }}>
                <Lock size={14} /> Blokir Jadwal
            </button>
            {notice && <p role="status">{notice}</p>}
            {open && (
                <BlockScheduleModal
                    rooms={activeRooms} date={date} room={room}
                    onClose={() => setOpen(false)} onConfirm={save}
                />
            )}
        </div>
    );
}

export function UnblockButton({ id, roomName, className }: { id: string; roomName: string; className?: string }) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const running = useRef(false);
    const router = useRouter();

    async function remove() {
        if (running.current || !window.confirm('Buka kembali jadwal ' + roomName + '?')) return;
        running.current = true;
        setPending(true);
        setError('');
        try {
            await changeBlock('/api/admin/schedule-blocks?' + new URLSearchParams({ id }), { method: 'DELETE' });
            router.refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Blokir belum bisa dibuka.');
        } finally {
            running.current = false;
            setPending(false);
        }
    }
    return (
        <div>
            <button className={className} type="button" disabled={pending} onClick={remove}>
                {pending ? 'Membuka…' : 'Buka blokir'}
            </button>
            {error && <p role="alert">{error}</p>}
        </div>
    );
}

export function PrintAgendaButton({ className }: { className?: string }) {
    return <button className={className} type="button" onClick={() => window.print()}><Printer size={16} /> Cetak agenda</button>;
}
