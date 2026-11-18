'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Images, Upload, X } from 'lucide-react';
import {
    PORTFOLIO_RATIOS, PORTFOLIO_UPLOAD_LIMIT, type PortfolioCategory,
    type PortfolioPackage, type PortfolioPhoto,
} from '@/lib/portfolioTypes';
import styles from './PortfolioEditor.module.css';

export type LocalPhoto = { file: File; url: string };
export type DraftPhoto = Omit<PortfolioPhoto, 'source'> & {
    source: PortfolioPhoto['source'] | { kind: 'local'; file: LocalPhoto };
};

export function photoSrc(photo: Pick<DraftPhoto, 'source'>, storageBase: string) {
    if (photo.source.kind === 'local') return photo.source.file.url;
    if (photo.source.kind === 'package') return photo.source.src;
    return storageBase + photo.source.path.split('/').map(encodeURIComponent).join('/');
}

interface Props {
    photo: DraftPhoto | null;
    packages: PortfolioPackage[];
    categories: PortfolioCategory[];
    storageBase: string;
    onFile: (file: File) => LocalPhoto;
    onSave: (photo: DraftPhoto) => void;
    onClose: () => void;
}

export default function PortfolioPhotoDialog({ photo, packages, categories, storageBase, onFile, onSave, onClose }: Props) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [title, setTitle] = useState(photo?.title ?? '');
    const [alt, setAlt] = useState(photo?.alt ?? '');
    const [categoryId, setCategoryId] = useState(photo?.categoryId ?? '');
    const [visible, setVisible] = useState(photo?.visible ?? true);
    const [source, setSource] = useState<DraftPhoto['source'] | undefined>(photo?.source);
    const [aspectRatio, setAspectRatio] = useState(photo?.aspectRatio ?? '4 / 5');
    const [position, setPosition] = useState(photo?.position ?? 'center');
    const [chooser, setChooser] = useState<'package' | 'upload' | null>(photo ? null : 'package');
    const [error, setError] = useState('');

    useEffect(() => { dialog.current?.showModal(); }, []);

    function pickPackage(pack: PortfolioPackage) {
        setSource({ kind: 'package', packageId: pack.id, label: pack.title, src: pack.src });
        if (!title.trim()) setTitle(pack.title);
        if (!categoryId) setCategoryId(pack.categoryId);
        setAspectRatio(pack.aspectRatio);
        setPosition(pack.position);
        setError('');
    }

    function pickFile(file: File | undefined) {
        if (!file) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > PORTFOLIO_UPLOAD_LIMIT) {
            setError('Pilih JPG, PNG, atau WebP berukuran maksimal 4 MB.');
            return;
        }
        setSource({ kind: 'local', file: onFile(file) });
        setPosition('center');
        setError('');
    }

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!source || !title.trim() || !alt.trim() || !categoryId) {
            setError('Pilih foto dan kategori, lalu isi judul dan teks alternatif.');
            return;
        }
        onSave({
            id: photo?.id ?? crypto.randomUUID(), title: title.trim(), alt: alt.trim(), categoryId,
            visible, aspectRatio, position, source,
        });
    }

    const preview = source ? photoSrc({ source }, storageBase) : null;
    const positions = [...new Set([position, 'center', 'center top', 'center 25%', 'center 75%', 'center bottom', 'left center', 'right center'])];

    return (
        <dialog ref={dialog} className={styles.drawer} aria-labelledby="photo-dialog-title" onClose={onClose}
            onCancel={(event) => { event.preventDefault(); onClose(); }}>
            <form onSubmit={submit} className={styles.drawerForm}>
                <header className={styles.drawerHeader}>
                    <div>
                        <h2 id="photo-dialog-title">{photo ? 'Edit Foto Galeri' : 'Tambah Foto Galeri'}</h2>
                        <p>Pilih foto paket yang sudah ada atau unggah foto baru.</p>
                    </div>
                    <button type="button" className={styles.iconButton} aria-label="Tutup panel" onClick={onClose}><X size={20} /></button>
                </header>
                <div className={styles.drawerBody}>
                    {!chooser && <button type="button" className={styles.button} onClick={() => setChooser('package')}><Images size={16} /> Ganti Foto</button>}
                    {chooser && (
                        <>
                            <div className={styles.segments} aria-label="Sumber foto">
                                <button type="button" aria-pressed={chooser === 'package'} onClick={() => setChooser('package')}><Images size={15} /> Pilih dari Foto Paket</button>
                                <button type="button" aria-pressed={chooser === 'upload'} onClick={() => setChooser('upload')}><Upload size={15} /> Unggah Foto Baru</button>
                            </div>
                            {chooser === 'package' ? (
                                packages.length ? <div className={styles.packagePicker} aria-label="Foto paket yang tersedia">
                                    {packages.map((pack) => {
                                        const selected = source?.kind === 'package' && source.packageId === pack.id;
                                        return (
                                            <button key={pack.id} type="button" aria-pressed={selected} onClick={() => pickPackage(pack)}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={pack.src} alt="" loading="lazy" />
                                                <span>{pack.title}</span>
                                                {selected && <Check size={14} aria-hidden />}
                                            </button>
                                        );
                                    })}
                                </div> : <p>Belum ada foto paket aktif.</p>
                            ) : (
                                <label className={styles.uploadField}>Pilih file JPG, PNG, atau WebP · Maks. 4 MB
                                    <input type="file" accept="image/jpeg,image/png,image/webp"
                                        onChange={(event) => { pickFile(event.target.files?.[0]); event.target.value = ''; }} />
                                </label>
                            )}
                        </>
                    )}

                    {preview && (
                        <section className={styles.crop} aria-label="Pratinjau potongan foto">
                            <div className={styles.cropImage} style={{ aspectRatio }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt={alt || title || 'Foto yang dipilih'} style={{ objectPosition: position }} />
                            </div>
                            <div className={styles.twoColumns}>
                                <label>Rasio kartu<select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                                    {PORTFOLIO_RATIOS.map((ratio) => <option key={ratio}>{ratio}</option>)}
                                </select></label>
                                <label>Posisi foto<select value={position} onChange={(event) => setPosition(event.target.value)}>
                                    {positions.map((value) => <option key={value} value={value}>{({
                                        center: 'Tengah', 'center top': 'Atas', 'center bottom': 'Bawah',
                                        'left center': 'Kiri', 'right center': 'Kanan',
                                    } as Record<string, string>)[value] ?? value}</option>)}
                                </select></label>
                            </div>
                        </section>
                    )}

                    <label>Judul Foto<input required value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label>
                    <label>Kategori<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                        <option value="">Pilih kategori</option>
                        {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                    </select></label>
                    <label>Teks Alternatif<input required value={alt} maxLength={240} onChange={(event) => setAlt(event.target.value)}
                        placeholder="Misalnya: Keluarga berpose di ruang studio" /></label>
                    <label className={styles.switchLabel}>
                        <input type="checkbox" role="switch" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
                        Tampilkan di Website
                    </label>
                    {error && <p role="alert" className={styles.error}>{error}</p>}
                </div>
                <footer className={styles.drawerFooter}>
                    <button className={styles.button} type="button" onClick={onClose}>Batal</button>
                    <button className={styles.primary} type="submit"><Check size={16} /> Simpan Foto</button>
                </footer>
            </form>
        </dialog>
    );
}
