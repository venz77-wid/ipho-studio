'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import styles from './Navbar.module.css';

interface NavLink {
    label: string;
    href: string;
}

const NAV_LINKS: NavLink[] = [
    { label: 'Beranda', href: '/' },
    { label: 'Katalog Paket', href: '/katalog' },
    { label: 'Portofolio', href: '/portofolio' },
    { label: 'Tentang Studio', href: '/tentang' },
    { label: 'Kontak', href: '/kontak' },
];

export default function Navbar(): React.JSX.Element {
    const pathname = usePathname();

    const isActive = (href: string): boolean =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand}>
                    {/* File: public/images/logo.png */}
                    <Image
                        src="/images/logo.png"
                        alt="IPHO Studio Logo"
                        width={50}
                        height={50}
                    />
                    <span className={styles.brandText}>IPHO STUDIO</span>
                </Link>

                <nav className={styles.nav} aria-label="Navigasi utama">
                    {NAV_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={isActive(link.href) ? `${styles.link} ${styles.active}` : styles.link}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <button type="button" className={styles.profile} aria-label="Profil pengguna">
                    <User size={16} strokeWidth={2} />
                </button>
            </div>
        </header>
    );
}