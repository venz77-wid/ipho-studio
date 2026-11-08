import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import ContentEditor from '@/components/StudioContent/ContentEditor';
import { loadStudioContent } from '@/lib/studioContentData';
import { loadStudioHours } from '@/lib/studioHoursData';
import { getStudioNow } from '@/lib/scheduleUtils';

export default async function AdminAboutPage() {
    const [initial, { hours }] = await Promise.all([loadStudioContent(), loadStudioHours()]);
    return <AdminScheduleShell section="website">
        <ContentEditor initial={initial} hours={hours} today={getStudioNow().date} />
    </AdminScheduleShell>;
}
