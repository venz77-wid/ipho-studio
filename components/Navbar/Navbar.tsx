'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import LogoutButton from '@/components/LogoutButton';
import styles from './Navbar.module.css';

interface NavLink {
    label: string;
    href: string;
}

const NAV_LINKS: NavLink[] = [
    { label: 'Beranda', href: '/' },
    { label: 'Katalog Paket', href: '/katalog' },
    { label: 'Paket Saya', href: '/paket-saya' },
    { label: 'Portofolio', href: '/portofolio' },
    { label: 'Tentang & Kontak', href: '/tentang' },
];

export default function Navbar({ activePath }: { activePath?: string } = {}): React.JSX.Element {
    const currentPath = usePathname();
    const pathname = activePath ?? currentPath;
    const mobile = useRef<HTMLDetailsElement>(null);
    const isActive = (href: string): boolean =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <Link href="/" className={styles.brand}>
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
                            aria-current={isActive(link.href) ? 'page' : undefined}
                            className={isActive(link.href) ? `${styles.link} ${styles.active}` : styles.link}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <details ref={mobile} className={styles.mobileMenu}>
                    <summary>Menu</summary>
                    <nav aria-label="Navigasi seluler">
                        {NAV_LINKS.map((link) => <Link href={link.href} key={link.href}
                            aria-current={isActive(link.href) ? 'page' : undefined}
                            onClick={() => { if (mobile.current) mobile.current.open = false; }}>
                            {link.label}
                        </Link>)}
                    </nav>
                </details>
                <LogoutButton className={styles.logoutButton} />
            </div>
        </header>
    );
}