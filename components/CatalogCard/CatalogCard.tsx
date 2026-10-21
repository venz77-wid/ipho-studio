import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Briefcase, CircleCheck, Clock, Heart, User, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatRupiah, type CapacityIcon, type CatalogPackage } from '@/lib/catalogTypes';
import styles from './CatalogCard.module.css';

const ICONS: Record<CapacityIcon, LucideIcon> = {
    user: User,
    users: Users,
    heart: Heart,
    briefcase: Briefcase,
};

interface CatalogCardProps {
    data: CatalogPackage;
}

export default function CatalogCard({ data }: CatalogCardProps): React.JSX.Element {
    const CapIcon = ICONS[data.capacityIcon];

    return (
        <article className={styles.card}>
            <div className={styles.media}>
                {data.imageSrc && (
                    // File di folder public, mis. public/images/packages/solofoto.jpg
                    <Image
                        src={data.imageSrc}
                        alt={data.title}
                        fill
                        sizes="(max-width: 900px) 100vw, 33vw"
                        className={styles.img}
                        style={{ objectPosition: data.imagePosition }}
                    />
                )}
                <div className={styles.tags}>
                    <span className={styles.tagLabel}>{data.label}</span>
                    {data.badge && <span className={styles.tagBadge}>{data.badge}</span>}
                </div>
                <span className={styles.duration}>
                    <Clock size={11} aria-hidden /> {data.durationMinutes} Menit
                </span>
            </div>

            <div className={styles.body}>
                <p className={styles.capacity}>
                    <CapIcon size={12} aria-hidden /> {data.capacityLabel}
                </p>
                <h3 className={styles.title}>{data.title}</h3>
                <p className={styles.desc}>{data.description}</p>

                <ul className={styles.features}>
                    {data.features.map((f) => (
                        <li key={f}>
                            <CircleCheck size={13} aria-hidden /> <span>{f}</span>
                        </li>
                    ))}
                </ul>

                <div className={styles.priceRow}>
                    <span>MULAI DARI</span>
                    <span className={styles.unit}>/ {data.priceUnit}</span>
                </div>
                <p className={styles.price}>{formatRupiah(data.price)}</p>

                <Link href={`/booking?paket=${data.slug}`} className={styles.cta}>
                    Pilih Paket <ArrowRight size={13} aria-hidden />
                </Link>
            </div>
        </article>
    );
}