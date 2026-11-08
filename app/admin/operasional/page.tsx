import AdminScheduleShell from '@/components/AdminSchedule/AdminScheduleShell';
import HoursEditor from '@/components/StudioContent/HoursEditor';
import { loadStudioHours } from '@/lib/studioHoursData';
import { getStudioNow } from '@/lib/scheduleUtils';

export default async function StudioOperationsPage() {
    const { hours, revision } = await loadStudioHours();
    return <AdminScheduleShell section="hours">
        <HoursEditor initial={hours} initialRevision={revision} today={getStudioNow().date} />
    </AdminScheduleShell>;
}
