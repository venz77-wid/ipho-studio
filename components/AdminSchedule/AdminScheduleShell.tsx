import type { ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import AdminSidebar, { type AdminSection } from './AdminSidebar';
import styles from '@/app/admin/kalender/page.module.css';

export default function AdminScheduleShell({ children, section = 'calendar' }: { children: ReactNode; section?: Exclude<AdminSection, 'dashboard'> }) {
    return (
        <div className={styles.adminLayout}>
            <AdminSidebar section={section} />
            <main className={`${styles.mainContent} ${section === 'calendar' ? '' : styles.editorContent}`}>
                <header className={styles.topHeader}>
                    <div className={styles.headerLeft}><Calendar size={16} /> {section === 'website' ? 'Kelola Website' : 'Jadwal studio · WITA'}</div>
                </header>
                <div className={styles.contentBody}>{children}</div>
            </main>
        </div>
    );
}
