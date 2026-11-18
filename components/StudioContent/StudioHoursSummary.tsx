import { DAY_NAMES, hoursLabel, type StudioHours } from '@/lib/studioHours';
import { studioDayIndex } from '@/lib/scheduleUtils';

export default function StudioHoursSummary({ hours, today }: { hours: StudioHours | null; today: string }) {
    if (!hours) return <p>Hubungi admin untuk mengetahui jam buka.</p>;

    const groups = hours.week.reduce<{ first: number; last: number; text: string }[]>((list, ranges, index) => {
        const text = hoursLabel(ranges);
        const previous = list.at(-1);
        if (previous?.text === text) previous.last = index;
        else list.push({ first: index, last: index, text });
        return list;
    }, []);

    const exceptions = Object.entries(hours.exceptions).filter(([date]) => date >= today).sort().slice(0, 5);
    return <dl>
        {groups.map(({ first, last, text }) => (
            <div key={first}>
                <dt>{DAY_NAMES[first]}{first !== last && `–${DAY_NAMES[last]}`}</dt>
                <dd>{text}</dd>
            </div>
        ))}
        {exceptions.map(([date, ranges]) => (
            <div key={date}>
                <dt>{DAY_NAMES[studioDayIndex(date)]}, {date.split('-').reverse().join('/')}</dt>
                <dd>{hoursLabel(ranges)}</dd>
            </div>
        ))}
    </dl>;
}
