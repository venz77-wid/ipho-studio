'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { logout } from '@/app/login/actions';

export default function LogoutButton({ className }: { className?: string }) {
    const [pending, setPending] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    async function handleLogout() {
        if (pending) return;
        setPending(true);
        setErrorMessage('');

        try {
            const result = await logout();

            if (result.error) {
                setErrorMessage(result.error);
                return;
            }

            window.location.replace('/login');
        } catch {
            setErrorMessage('Tidak dapat menghubungi server. Coba lagi.');
        } finally {
            setPending(false);
        }
    }

    return (
        <>
            <button
                type="button"
                className={className}
                disabled={pending}
                onClick={handleLogout}
                aria-label={pending ? 'Sedang keluar' : 'Logout'}
            >
                <LogOut size={18} aria-hidden />
                <span>{pending ? 'Keluar...' : 'Logout'}</span>
            </button>

            {errorMessage && (
                <p role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>
                    {errorMessage}
                </p>
            )}
        </>
    );
}
