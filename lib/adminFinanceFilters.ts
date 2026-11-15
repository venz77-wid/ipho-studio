import { isScheduleDate, type ScheduleParams } from './adminSchedule';
import { addDays, getStudioNow } from './scheduleUtils';

export const FINANCE_PATH = '/admin/laporan';
export const FINANCE_PAGE_SIZE = 5;
export const MAX_FINANCE_DAYS = 366;
export type DailyIncome = { date: string; midtrans: number; cashier: number };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

export function readFinanceFilters(params: ScheduleParams, today = getStudioNow().date) {
    const mode = first(params.periode);
    const period = mode === 'hari' || mode === 'pilih' ? mode : 'bulan';
    const customFrom = first(params.mulai);
    const customTo = first(params.sampai);
    const from = period === 'hari' ? today : period === 'bulan' ? today.slice(0, 7) + '-01' : customFrom;
    const to = period === 'pilih' ? customTo : today;
    const validDates = isScheduleDate(from) && isScheduleDate(to) && from <= to && to <= today;
    const invalid = !validDates || to >= addDays(from, MAX_FINANCE_DAYS);
    const requestedPage = Number(first(params.hal));
    return {
        period, from, to, today, invalid,
        tab: first(params.tab) === 'tagihan' ? 'tagihan' : 'masuk',
        page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    } as const;
}

export type FinanceFilters = ReturnType<typeof readFinanceFilters>;

export function financeQuery(filters: Pick<FinanceFilters, 'period' | 'from' | 'to' | 'tab' | 'page'>) {
    const query = new URLSearchParams({ periode: filters.period, tab: filters.tab });
    if (filters.period === 'pilih') {
        query.set('mulai', filters.from);
        query.set('sampai', filters.to);
    }
    if (filters.page > 1) query.set('hal', String(filters.page));
    return query.toString();
}

export function financeHref(filters: Parameters<typeof financeQuery>[0]) {
    return FINANCE_PATH + '?' + financeQuery(filters);
}

export function financeDetailBack(value: string) {
    const filters = readFinanceFilters(Object.fromEntries(new URLSearchParams(value.slice(0, 500))));
    return financeHref(filters.invalid ? { ...filters, period: 'bulan', page: 1 } : filters);
}
