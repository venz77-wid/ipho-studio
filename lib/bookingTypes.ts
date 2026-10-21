import type { CatalogPackage } from './catalogTypes';

export type PaymentScheme = 'dp' | 'full';

export type PaymentMethod = 'qris' | 'bca_va' | 'mandiri_va';

export interface TimeSlot {
    id: string;
    startTime: string; 
    endTime: string;  
    period: 'Pagi' | 'Siang' | 'Golden Hour' | 'Malam';
    isAvailable: boolean;
    reason?: string;
}

export interface BookingFormData {
    packageSlug: string;
    bookingDate: string; 
    startTime: string;   
    endTime: string;     
    fullName: string;
    whatsapp: string;
    email: string;
    specialNotes: string;
    paymentScheme: PaymentScheme;
    paymentMethod: PaymentMethod;
}