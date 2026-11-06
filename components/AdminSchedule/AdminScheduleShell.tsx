import type { ReactNode } from 'react';
import Link from 'next/link';
import { Calendar, CalendarDays, LayoutDashboard } from 'lucide-react';
import LogoutButton from '@/components/LogoutButton';
import styles from '@/app/admin/kalender/page.module.css';

export default function AdminScheduleShell({ children }: { children: ReactNode }) {
    return (
        <div className={styles.adminLayout}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarTop}>
                    <div className={styles.brand}>
                        <div>
                            <h1 className={styles.brandName}>IPHO STUDIO</h1>
                            <p className={styles.brandRole}>ADMIN PANEL</p>
                        </div>
                        <div className={styles.dotIndicator} />
                    </div>
                    <div className={styles.navGroup}>
                        <nav className={styles.navMenu}>
                            <Link href="/admin" className={styles.navItem}><LayoutDashboard size={18} /> Dashboard</Link>
                            <Link href="/admin/kalender" className={`${styles.navItem} ${styles.active}`}>
                                <CalendarDays size={18} /> Rekap Kalender
                            </Link>
                        </nav>
                    </div>
                </div>
                <div className={styles.sidebarBottom}><LogoutButton className={styles.logoutBtn} /></div>
            </aside>
            <main className={styles.mainContent}>
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}><Calendar size={16} /> Jadwal studio · WIB</div>
                </header>
                <div className={styles.contentBody}>{children}</div>
            </main>
        </div>
    );
}
