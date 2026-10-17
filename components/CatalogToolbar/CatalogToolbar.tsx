'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search } from 'lucide-react';
import {
    SORT_OPTIONS,
    buildCatalogHref,
    type CategoryOption,
    type SortKey,
} from '@/lib/catalogTypes';
import styles from './CatalogToolbar.module.css';

interface CatalogToolbarProps {
    categories: CategoryOption[];
    totalActive: number;
    q: string;
    category: string;
    sort: SortKey;
}

export default function CatalogToolbar({
    categories,
    totalActive,
    q,
    category,
    sort,
}: CatalogToolbarProps): React.JSX.Element {
    const router = useRouter();
    const [text, setText] = useState<string>(q);

    // Pencarian otomatis 0,4 detik setelah berhenti mengetik
    useEffect(() => {
        const t = setTimeout(() => {
            if (text.trim() !== q) {
                router.replace(buildCatalogHref({ q: text.trim(), category, sort }), { scroll: false });
            }
        }, 400);
        return () => clearTimeout(t);
    }, [text, q, category, sort, router]);

    return (
        <div className={styles.toolbar}>
            <label className={styles.search}>
                <Search size={14} aria-hidden />
                <input
                    type="search"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Cari nama paket atau jenis foto..."
                    aria-label="Cari paket"
                />
            </label>

            <nav className={styles.pills} aria-label="Filter kategori">
                <Link
                    href={buildCatalogHref({ q, sort })}
                    scroll={false}
                    className={!category ? `${styles.pill} ${styles.active}` : styles.pill}
                >
                    Semua Paket ({totalActive})
                </Link>
                {categories.map((c) => (
                    <Link
                        key={c.slug}
                        href={buildCatalogHref({ q, category: c.slug, sort })}
                        scroll={false}
                        className={category === c.slug ? `${styles.pill} ${styles.active}` : styles.pill}
                    >
                        {c.name} ({c.count})
                    </Link>
                ))}
            </nav>

            <label className={styles.sort}>
                <span>Urutkan:</span>
                <div className={styles.selectWrap}>
                    <select
                        value={sort}
                        onChange={(e) =>
                            router.push(buildCatalogHref({ q, category, sort: e.target.value as SortKey }), {
                                scroll: false,
                            })
                        }
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} aria-hidden />
                </div>
            </label>
        </div>
    );
}