import type { ReactNode } from 'react';
import { Calendar, Receipt } from 'lucide-react';
import AdminSidebar, { type AdminSection } from './AdminSidebar';
import styles from '@/app/admin/kalender/page.module.css';

export default function AdminScheduleShell({ children, section = 'calendar' }: { children: ReactNode; section?: Exclude<AdminSection, 'dashboard'> }) {
    const Icon = section === 'orders' ? Receipt : Calendar;
    const title = section === 'orders' ? 'Admin / Pesanan'
        : section === 'website' ? 'Kelola Website' : 'Jadwal studio · WITA';

    return (
        <div className={styles.adminLayout}>
            <AdminSidebar section={section} />
            <main className={`${styles.mainContent} ${section === 'calendar' ? '' : styles.editorContent}`}>
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}><Icon size={16} aria-hidden /> {title}</div>
                </header>
                <div className={styles.contentBody}>{children}</div>
            </main>
        </div>
    );
}
