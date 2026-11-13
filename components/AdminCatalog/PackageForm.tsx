'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Briefcase, Check, CircleCheck, Heart, Plus, Trash2, Upload, User, Users, X } from 'lucide-react';
import CatalogCard from '@/components/CatalogCard/CatalogCard';
import { CAPACITY_OPTIONS, CATALOG_PHOTO_LIMIT, CATALOG_PHOTO_TYPES, EMPTY_PACKAGE, type AdminPackage, type CatalogCategory, type PackageDraft } from '@/lib/adminCatalogTypes';
import styles from './AdminCatalog.module.css';

const icons = { user: User, users: Users, heart: Heart, briefcase: Briefcase };

interface Props {
    item: AdminPackage | null;
    categories: CatalogCategory[];
    onClose: () => void;
    onSave: (draft: PackageDraft, file: File | null) => Promise<void>;
}

export default function PackageForm({ item, categories, onClose, onSave }: Props) {
    const [draft, setDraft] = useState<PackageDraft>(() => item ?? { ...EMPTY_PACKAGE });
    const [file, setFile] = useState<File | null>(null);
    const [photoError, setPhotoError] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [blobUrl, setBlobUrl] = useState<string>();
    const dialog = useRef<HTMLDialogElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const titleId = useId();
    const imageSrc = blobUrl ?? item?.imageSrc ?? null;
    const focalPoint = Number(draft.imagePosition.match(/(\d+)%$/)?.[1] ?? 50);
    const category = categories.find((c) => c.id === draft.categoryId);

    useEffect(() => { dialog.current?.showModal(); }, []);
    useEffect(() => {
        if (!blobUrl) return;
        return () => URL.revokeObjectURL(blobUrl);
    }, [blobUrl]);

    function field<K extends keyof PackageDraft>(key: K, value: PackageDraft[K]) {
        setDraft((prev) => ({ ...prev, [key]: value }));
    }

    function pickPhoto(selected: File | undefined) {
        if (!selected) return;
        if (!CATALOG_PHOTO_TYPES.includes(selected.type) || !selected.size || selected.size > CATALOG_PHOTO_LIMIT) {
            setPhotoError('Pilih JPG, PNG, atau WebP dengan ukuran maksimal 5 MB.');
            return;
        }
        setFile(selected);
        setBlobUrl(URL.createObjectURL(selected));
        setPhotoError('');
    }

    function cancelPhoto() {
        setFile(null);
        setBlobUrl(undefined);
        field('imagePosition', item?.imagePosition ?? 'center');
        setPhotoError('');
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        setError('');
        setBusy(true);
        try {
            await onSave({ ...draft, features: draft.features.map((text) => text.trim()).filter(Boolean) }, file);
        } catch (problem) {
            setError(problem instanceof Error ? problem.message : 'Paket belum dapat disimpan.');
            setBusy(false);
        }
    }

    return (
        <dialog ref={dialog} className={styles.drawer} aria-labelledby={titleId}
            onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
            <form className={styles.form} onSubmit={submit}>
                <header className={styles.drawerHeader}>
                    <h2 id={titleId}>{item ? 'Edit Paket Studio' : 'Tambah Paket Studio'}</h2>
                    <button type="button" className={styles.iconButton} aria-label="Tutup form" onClick={onClose} disabled={busy}><X size={20} /></button>
                </header>
                <fieldset disabled={busy} className={styles.formBody}>
                    <section className={styles.formSection}>
                        <h3>Informasi Paket</h3>
                        <label>Nama Paket<input required maxLength={120} value={draft.title} placeholder="Contoh: Personal Branding Editorial"
                            onChange={(event) => field('title', event.target.value)} /></label>
                        <label>Kategori Paket<select required value={draft.categoryId} onChange={(event) => field('categoryId', event.target.value)}>
                            <option value="">Pilih kategori</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select></label>
                        <label>Deskripsi Singkat<textarea rows={3} maxLength={200} value={draft.description}
                            placeholder="Jelaskan isi sesi foto secara singkat" onChange={(event) => field('description', event.target.value)} />
                            <small className={styles.characterCount}>{draft.description.length} / 200 karakter</small></label>
                    </section>
                    <section className={styles.formSection}>
                        <h3>Harga &amp; Isi Paket</h3>
                        <div className={styles.twoColumns}>
                            <label>Harga (Rp)<input required inputMode="numeric" value={draft.price ? new Intl.NumberFormat('id-ID').format(draft.price) : ''}
                                placeholder="149.000" onChange={(event) => {
                                    const value = event.target.value;
                                    if (/^[0-9.]*$/.test(value)) field('price', Math.min(2147483647, Number(value.replaceAll('.', ''))));
                                }} /></label>
                            <label>Satuan Harga<input required maxLength={40} value={draft.priceUnit} onChange={(event) => field('priceUnit', event.target.value)} /></label>
                            <label>Durasi (menit)<input required type="number" min={1} max={1439} value={draft.durationMinutes || ''}
                                placeholder="30" onChange={(event) => field('durationMinutes', Number(event.target.value))} /></label>
                        </div>
                        <label>Kapasitas Peserta<input required maxLength={160} value={draft.capacityLabel} placeholder="Kapasitas: 1–2 Orang"
                            onChange={(event) => field('capacityLabel', event.target.value)} /></label>
                        <div className={styles.facilities}>
                            <h4>Daftar Fasilitas Paket</h4>
                            {!draft.features.length && <p className={styles.empty}>Belum ada fasilitas yang ditambahkan.</p>}
                            {draft.features.map((feature, index) => (
                                <div className={styles.facility} key={index}>
                                    <CircleCheck size={15} aria-hidden />
                                    <textarea aria-label={`Fasilitas ${index + 1}`} rows={2} maxLength={240} value={feature}
                                        onChange={(event) => field('features', draft.features.map((value, i) => i === index ? event.target.value : value))} />
                                    <button type="button" className={styles.iconButton} aria-label={`Hapus fasilitas ${index + 1}`}
                                        onClick={() => field('features', draft.features.filter((_, i) => i !== index))}><Trash2 size={16} /></button>
                                </div>
                            ))}
                            <button type="button" className={styles.button} disabled={draft.features.length >= 30}
                                onClick={() => field('features', [...draft.features, ''])}><Plus size={16} /> Tambah Fasilitas</button>
                        </div>
                    </section>
                    <section className={styles.formSection}>
                        <h3>Tampilan Kartu</h3>
                        <div className={styles.twoColumns}>
                            <label>Label di Atas Foto<input maxLength={60} value={draft.label} placeholder={category?.name ?? 'Mengikuti kategori jika kosong'}
                                onChange={(event) => field('label', event.target.value)} /></label>
                            <label>Badge Opsional<input maxLength={60} value={draft.badge ?? ''} placeholder="Contoh: Favorit Pemula"
                                onChange={(event) => field('badge', event.target.value || null)} /></label>
                        </div>
                        <div>
                            <h4>Ikon Kapasitas</h4>
                            <div className={styles.iconChoices}>
                                {CAPACITY_OPTIONS.map(([value, name]) => {
                                    const Icon = icons[value];
                                    return <label key={value}><input type="radio" name="capacity-icon" value={value}
                                        checked={draft.capacityIcon === value} onChange={() => field('capacityIcon', value)} /><Icon size={16} /> {name}</label>;
                                })}
                            </div>
                        </div>
                    </section>
                    <section className={styles.formSection}>
                        <h3>Foto &amp; Status</h3>
                        <div className={styles.upload} onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => { event.preventDefault(); if (!busy) pickPhoto(event.dataTransfer.files[0]); }}>
                            <input ref={input} hidden type="file" accept={CATALOG_PHOTO_TYPES.join(',')} aria-label="Berkas foto paket"
                                onChange={(event) => { pickPhoto(event.target.files?.[0]); event.target.value = ''; }} />
                            <button type="button" className={styles.button} onClick={() => input.current?.click()}>
                                <Upload size={16} /> {imageSrc ? 'Ganti Foto' : 'Unggah Foto Baru'}
                            </button>
                            <small>JPG, PNG, atau WebP · maks. 5 MB</small>
                            {file && <div className={styles.selectedFile}>
                                <span><Check size={15} /> {file.name} · {(file.size / 1_000_000).toFixed(2)} MB · Siap diunggah</span>
                                <button type="button" className={styles.button} onClick={cancelPhoto}>Batalkan Pilihan</button>
                            </div>}
                            {photoError && <p className={styles.error} role="alert">{photoError}</p>}
                        </div>
                        <label>Posisi Vertikal Foto ({focalPoint}%)
                            <input type="range" min={0} max={100} value={focalPoint} disabled={!imageSrc}
                                onChange={(event) => field('imagePosition', `center ${event.target.value}%`)} />
                        </label>
                        <section className={styles.preview} aria-label="Pratinjau Kartu Katalog Pelanggan">
                            <h4>Pratinjau Kartu Katalog Pelanggan</h4>
                            <CatalogCard preview data={{
                                ...draft, id: item?.id ?? 'preview', slug: item?.slug ?? '',
                                title: draft.title || 'Nama Paket', label: draft.label.trim() || category?.name || 'Kategori',
                                features: draft.features.filter((feature) => feature.trim()), imageSrc,
                            }} />
                        </section>
                        <label className={styles.toggle}>
                            <span><strong>Aktif di Katalog</strong><small>Paket aktif tersedia untuk pemesanan baru.</small></span>
                            <input type="checkbox" role="switch" checked={draft.active} onChange={(event) => field('active', event.target.checked)} />
                        </label>
                        <label className={styles.toggle}>
                            <span><strong>Paket Unggulan</strong><small>Beranda menampilkan hingga empat paket aktif unggulan.</small></span>
                            <input type="checkbox" role="switch" checked={draft.featured} onChange={(event) => field('featured', event.target.checked)} />
                        </label>
                    </section>
                </fieldset>
                <footer className={styles.drawerFooter}>
                    {error && <p className={styles.error} role="alert">{error}</p>}
                    <button className={styles.button} type="button" disabled={busy} onClick={onClose}>Batal</button>
                    <button className={styles.primary} type="submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan Paket'}</button>
                </footer>
            </form>
        </dialog>
    );
}
