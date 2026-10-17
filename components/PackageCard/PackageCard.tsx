import Image from 'next/image';
import { Check } from 'lucide-react';
import type { PhotoPackage } from '@/lib/supabaseMock';
import styles from './PackageCard.module.css';

interface PackageCardProps {
    data: PhotoPackage;
}

const formatRupiah = (n: number): string =>
    'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export default function PackageCard({ data }: PackageCardProps): React.JSX.Element {
    const { durationLabel, category, title, price, priceUnit, features, isPopular, imageSrc, imageAlt } = data;

    return (
        <article className={styles.card}>
            <div className={styles.media}>
                {/* File: public/images/packages/package-N.jpg */}
                <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 900px) 100vw, 25vw" className={styles.img} />
                <span className={styles.duration}>{durationLabel}</span>
                {<span className={styles.badge}>TERPOPULER</span>}
            </div>

            <div className={styles.body}>
                <span className={styles.category}>{category}</span>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.price}>
                    {formatRupiah(price)} <span>/ {priceUnit}</span>
                </p>

                <ul className={styles.features}>
                    {features.map((f) => (
                        <li key={f}>
                            <Check size={12} strokeWidth={2.5} aria-hidden />
                            {f}
                        </li>
                    ))}
                </ul>

                <button type="button" className={styles.cta}>Pilih Paket</button>
            </div>
        </article>
    );
}