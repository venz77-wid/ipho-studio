'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, EyeOff, ImageOff, Plus, Search } from 'lucide-react';
import { formatRupiah } from '@/lib/catalogTypes';
import type { AdminPackage, CatalogCategory, PackageDraft } from '@/lib/adminCatalogTypes';
import AdminRowAction from '@/components/AdminRowAction/AdminRowAction';
import PackageForm from './PackageForm';
import styles from './AdminCatalog.module.css';

const endpoint = '/api/admin/catalog';

async function save(method: string, data: FormData | object) {
    const multipart = data instanceof FormData;
    const response = await fetch(endpoint, {
        method, headers: multipart ? undefined : { 'Content-Type': 'application/json' },
        body: multipart ? data : JSON.stringify(data),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error(result?.error ?? (response.status === 413 ? 'Server menolak ukuran foto. Coba file yang lebih kecil.' : 'Perubahan belum dapat disimpan.'));
    return result;
}

function Thumbnail({ pack }: { pack: AdminPackage }) {
    return pack.imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.thumb} src={pack.imageSrc} alt="" loading="lazy" style={{ objectPosition: pack.imagePosition }} />
    ) : <span className={styles.thumb}><ImageOff size={18} aria-hidden /></span>;
}

function DeactivateDialog({ pack, category, onClose, onConfirm }: {
    pack: AdminPackage; category?: string; onClose: () => void; onConfirm: () => Promise<void>;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => { dialog.current?.showModal(); }, []);
    async function submit() {
        setBusy(true);
        try { await onConfirm(); } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'Status belum dapat disimpan.');
            setBusy(false);
        }
    }
    return (
        <dialog ref={dialog} className={styles.confirm} aria-labelledby="deactivate-title"
            onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
            <h2 id="deactivate-title">Nonaktifkan Paket {pack.title}?</h2>
            <p>Paket ini akan disembunyikan dari katalog dan tidak bisa dipilih untuk pesanan baru. Pesanan yang sudah dibuat tetap tercatat.</p>
            <div className={styles.confirmPackage}><Thumbnail pack={pack} /><div>
                <strong>{pack.title}</strong><p>{category} · {pack.durationMinutes} menit · {formatRupiah(pack.price)}</p>
            </div></div>
            <p>Paket dapat diaktifkan kembali dari filter Nonaktif.</p>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <div className={styles.actions}>
                <button className={styles.button} type="button" disabled={busy} onClick={onClose}>Batal</button>
                <button className={styles.primary} type="button" disabled={busy} onClick={submit}><EyeOff size={16} /> {busy ? 'Menyimpan…' : 'Nonaktifkan Paket'}</button>
            </div>
        </dialog>
    );
}

export default function AdminCatalog({ initial, categories }: { initial: AdminPackage[]; categories: CatalogCategory[] }) {
    const [packages, setPackages] = useState(initial);
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [status, setStatus] = useState('all');
    const [form, setForm] = useState<AdminPackage | null | undefined>(undefined);
    const [deactivate, setDeactivate] = useState<AdminPackage | null>(null);
    const [order, setOrder] = useState<AdminPackage[] | null>(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const categoryName = (id: string) => categories.find((category) => category.id === id)?.name;
    const visible = order ?? packages.filter((pack) => {
        const term = query.trim().toLocaleLowerCase('id');
        return (!term || [pack.title, pack.label, pack.description].some((text) => text.toLocaleLowerCase('id').includes(term))) &&
            (!categoryId || categoryId === pack.categoryId) &&
            (status === 'all' || pack.active === (status === 'active'));
    });

    function merge(pack: AdminPackage) {
        setPackages((current) => current.some((item) => item.id === pack.id)
            ? current.map((item) => item.id === pack.id ? pack : item)
            : [...current, pack]);
    }

    async function saveForm(draft: PackageDraft, photo: File | null) {
        const data = new FormData();
        data.set('package', JSON.stringify(draft));
        if (form) data.set('id', form.id);
        if (photo) data.set('photo', photo);
        const result = await save('POST', data);
        merge(result.package);
        setNotice(form ? 'Paket berhasil disimpan.' : 'Paket berhasil ditambahkan.');
        setError('');
        setForm(undefined);
        if (!form) resetFilters();
    }

    async function changeStatus(pack: AdminPackage, active: boolean) {
        const result = await save('PATCH', { id: pack.id, active });
        merge(result.package);
        setNotice(active ? 'Paket berhasil diaktifkan.' : 'Paket berhasil dinonaktifkan.');
        setError('');
        setDeactivate(null);
    }

    function activate(pack: AdminPackage) {
        setBusy(true);
        setError('');
        changeStatus(pack, true).catch((problem) => setError(problem.message)).finally(() => setBusy(false));
    }

    function resetFilters() {
        setQuery('');
        setCategoryId('');
        setStatus('all');
    }

    function move(index: number, delta: number) {
        if (!order || index + delta < 0 || index + delta >= order.length) return;
        const next = [...order];
        const [pack] = next.splice(index, 1);
        next.splice(index + delta, 0, pack);
        setOrder(next);
    }

    async function saveOrder() {
        if (!order) return;
        setBusy(true);
        setError('');
        try {
            await save('PUT', { expected: packages.map((pack) => pack.id), desired: order.map((pack) => pack.id) });
            setPackages(order.map((pack, index) => ({ ...pack, sortOrder: index + 1 })));
            setOrder(null);
            setNotice('Urutan rekomendasi berhasil disimpan.');
        } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'Urutan paket belum dapat disimpan.');
        } finally { setBusy(false); }
    }

    return (
        <section className={styles.catalog} aria-labelledby="admin-catalog-title">
            <header className={styles.heading}>
                <div><h2 id="admin-catalog-title">Kelola Katalog Paket</h2><p>{packages.length} paket terdaftar</p></div>
                <Link href="/katalog" target="_blank" rel="noreferrer" className={styles.button}>Lihat Katalog Pelanggan <ArrowUpRight size={16} /></Link>
            </header>
            <div className={styles.toolbar}>
                {order ? <><p>Urutan ini dipakai untuk Rekomendasi Utama di katalog pelanggan.</p><div className={styles.actions}>
                    <button className={styles.button} type="button" disabled={busy} onClick={() => { setOrder(null); setError(''); }}>Batal</button>
                    <button className={styles.primary} type="button" disabled={busy} onClick={saveOrder}>{busy ? 'Menyimpan…' : 'Simpan Urutan'}</button>
                </div></> : <>
                    <label className={styles.search}><Search size={16} aria-hidden />
                        <input aria-label="Cari nama, deskripsi, atau label paket" placeholder="Cari nama, deskripsi, atau label…" value={query}
                            onChange={(event) => setQuery(event.target.value)} /></label>
                    <select aria-label="Filter kategori" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                        <option value="">Semua Kategori</option>
                        {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <select aria-label="Filter status" value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="all">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option>
                    </select>
                    <button className={styles.button} type="button" disabled={busy || packages.length < 2} onClick={() => { setOrder(packages); setError(''); setNotice(''); }}><ArrowUpDown size={15} /> Atur Urutan</button>
                    <button className={styles.primary} type="button" disabled={busy} onClick={() => setForm(null)}><Plus size={17} /> Tambah Paket</button>
                </>}
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            {notice && <p className={styles.success} role="status">{notice}</p>}
            {visible.length === 0 ? <div className={styles.empty}>
                <p>{packages.length ? 'Tidak ada paket yang cocok dengan filter.' : 'Belum ada paket. Klik Tambah Paket untuk mulai.'}</p>
                {packages.length > 0 && <button type="button" className={styles.button} onClick={resetFilters}>Reset Filter</button>}
            </div> : (
                <table className={styles.table}>
                    <thead><tr><th scope="col">Paket</th><th scope="col">Kategori</th><th scope="col">Harga</th>
                        <th scope="col">Durasi</th><th scope="col">Status</th><th scope="col">{order ? 'Urutan' : 'Aksi'}</th></tr></thead>
                    <tbody>{visible.map((pack, index) => (
                        <tr key={pack.id} data-active={pack.active}>
                            <th scope="row"><div className={styles.packageName}><Thumbnail pack={pack} /><div>
                                <strong>{pack.title}</strong><p>{pack.description}</p>
                            </div></div></th>
                            <td className={styles.category}>{categoryName(pack.categoryId) ?? '—'}</td>
                            <td className={styles.amount}><strong>{formatRupiah(pack.price)}</strong><small>/ {pack.priceUnit}</small></td>
                            <td className={styles.duration}>{pack.durationMinutes} menit</td>
                            <td className={styles.status}><span className={pack.active ? styles.active : styles.inactive}>{pack.active ? 'Aktif' : 'Nonaktif'}</span>
                                {pack.featured && <span className={styles.featured}>Unggulan</span>}</td>
                            <td><div className={styles.rowActions}>
                                {order ? <>
                                    <span>#{index + 1}</span>
                                    <button type="button" className={styles.iconButton} disabled={busy || index === 0} aria-label={`Pindahkan ${pack.title} ke atas`} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
                                    <button type="button" className={styles.iconButton} disabled={busy || index === visible.length - 1} aria-label={`Pindahkan ${pack.title} ke bawah`} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
                                </> : <>
                                    <button type="button" className={styles.button} disabled={busy} onClick={() => setForm(pack)}>Edit</button>
                                    <AdminRowAction label={`Aksi untuk ${pack.title}`} disabled={busy}
                                        action={pack.active ? 'Nonaktifkan Paket' : 'Aktifkan Paket'}
                                        onAction={() => {
                                            if (pack.active) setDeactivate(pack);
                                            else activate(pack);
                                        }} />
                                </>}
                            </div></td>
                        </tr>
                    ))}</tbody>
                </table>
            )}
            <p className={styles.count}>Menampilkan {visible.length} dari {packages.length} paket</p>
            {form !== undefined && <PackageForm item={form} categories={categories} onClose={() => setForm(undefined)} onSave={saveForm} />}
            {deactivate && <DeactivateDialog pack={deactivate} category={categoryName(deactivate.categoryId)}
                onClose={() => setDeactivate(null)} onConfirm={() => changeStatus(deactivate, false)} />}
        </section>
    );
}
