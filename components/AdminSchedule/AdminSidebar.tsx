import type { ReactNode } from 'react';
import Link from 'next/link';
import { CalendarDays, Globe, LayoutDashboard, Settings2 } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import styles from '@/app/admin/kalender/page.module.css';

const sections = [
    { id: 'dashboard', href: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'calendar', href: '/admin/kalender', label: 'Rekap Kalender', Icon: CalendarDays },
    { id: 'website', href: '/admin/kelola-website', label: 'Kelola Website', Icon: Globe },
    { id: 'hours', href: '/admin/operasional', label: 'Ruangan & Operasional', Icon: Settings2 },
] as const;

export type AdminSection = typeof sections[number]['id'];

export default function AdminSidebar({ section, status }: {
    section: AdminSection;
    status?: ReactNode;
}) {
    return (
        <aside className={styles.sidebar}>
            <div className={styles.sidebarTop}>
                <div className={styles.brand}>
                    <div>
                        <h1 className={styles.brandName}>IPHO STUDIO</h1>
                        <p className={styles.brandRole}>ADMIN PANEL</p>
                    </div>
                    <div className={styles.dotIndicator} aria-hidden />
                </div>
                <nav className={styles.navMenu} aria-label="Navigasi admin">
                    {sections.map(({ id, href, label, Icon }) => {
                        const active = section === id;
                        return (
                            <Link
                                key={id}
                                href={href}
                                className={active ? `${styles.navItem} ${styles.active}` : styles.navItem}
                                aria-current={active ? 'location' : undefined}
                            >
                                <Icon size={18} aria-hidden />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className={styles.sidebarBottom}>
                {status}
                <LogoutButton className={styles.logoutBtn} />
            </div>
        </aside>
    );
}
