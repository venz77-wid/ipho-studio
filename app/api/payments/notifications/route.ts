// Webhook dari Midtrans. Baru bisa menerima dari internet setelah website di-deploy
// (atau lewat tunnel seperti ngrok). Isi URL-nya di dashboard Midtrans.
import { NextResponse } from 'next/server';
import { applyTransactionResult, verifySignature } from '@/lib/midtrans';

interface Notification {
    order_id?: string;
    status_code?: string;
    gross_amount?: string;
    signature_key?: string;
    transaction_status?: string;
    fraud_status?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
    const n = (await req.json().catch(() => null)) as Notification | null;
    if (!n || !verifySignature(n) || !n.order_id || !n.transaction_status) {
        return NextResponse.json({ error: 'Tanda tangan tidak valid' }, { status: 403 });
    }
    await applyTransactionResult(n.order_id, n.transaction_status, n.fraud_status);
    return NextResponse.json({ ok: true });
}