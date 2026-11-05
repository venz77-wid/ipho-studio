'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    Eye, 
    EyeOff, 
    MessageCircle, 
    ArrowRight, 
    PlusCircle, 
    Search, 
    Lock,
    CheckCircle2
} from 'lucide-react';
import styles from './page.module.css';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        // TODO: Integrasi Supabase Auth nanti ditaruh di sini
        console.log('Login attempt:', { identifier, password });
        
        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    };

    return (
        <main className={styles.wrapper}>
            <div className={styles.card}>
                {/* Panel Kiri - Branding */}
                <div className={styles.leftPanel}>
                    <div className={styles.brandWrapper}>
                        <h1 className={styles.logo}>IPHO STUDIO</h1>
                        <span className={styles.portalBadge}>PORTAL</span>
                    </div>
                    
                    <div className={styles.leftContent}>
                        <span className={styles.subtitle}>DOKUMENTASI & ESTETIKA</span>
                        <h2 className={styles.heading}>Abadikan momen terbaik bersama kami.</h2>
                        <p className={styles.description}>
                            Akses riwayat sesi, download galeri HD, dan kelola reservasi studio dalam satu portal terpadu.
                        </p>
                    </div>

                    <div className={styles.leftFooter}>
                        <div className={styles.secureText}>
                            <CheckCircle2 size={16} />
                            <span>Studio Resmi Supabase Auth</span>
                        </div>
                        <span className={styles.version}>v2.4</span>
                    </div>
                </div>

                {/* Panel Kanan - Form Login */}
                <div className={styles.rightPanel}>
                    <div className={styles.statusRow}>
                        <div className={styles.onlineStatus}>
                            <div className={styles.greenDot} />
                            <span>ONLINE</span>
                        </div>
                    </div>

                    <div className={styles.formHeader}>
                        <span className={styles.areaBadge}>AREA KLIEN & RESERVASI</span>
                        <h2 className={styles.formTitle}>Masuk Akun Pelanggan</h2>
                        <p className={styles.formSubtitle}>
                            Kelola pemesanan sesi foto, unduh galeri foto, atau cek status booking.
                        </p>
                    </div>

                    <div className={styles.socialLogins}>
                        <button type="button" className={styles.socialBtn}>
                            {/* SVG Icon Google Sederhana */}
                            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Google
                        </button>
                        <button type="button" className={styles.socialBtn}>
                            <MessageCircle size={18} color="#128C7E" />
                            WhatsApp OTP
                        </button>
                    </div>

                    <div className={styles.divider}>
                        <span>ATAU NOMOR / EMAIL</span>
                    </div>

                    <form onSubmit={handleLogin} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label className={styles.label}>NO. WHATSAPP / EMAIL</label>
                            <input 
                                type="text" 
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="0812xxxx atau email@domain.com" 
                                className={styles.input}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <div className={styles.labelRow}>
                                <label className={styles.label}>KATA SANDI</label>
                                <Link href="/lupa-sandi" className={styles.forgotLink}>Lupa kata sandi?</Link>
                            </div>
                            <div className={styles.passwordWrapper}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••" 
                                    className={styles.input}
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={styles.eyeBtn}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className={styles.submitBtn}
                        >
                            {isLoading ? 'Memproses...' : 'Masuk Akun Pelanggan'} 
                            {!isLoading && <ArrowRight size={18} />}
                        </button>
                    </form>

                    <div className={styles.actionLinks}>
                        <Link href="/register" className={styles.linkItem}>
                            <PlusCircle size={14} /> Belum punya akun? Daftar sesi foto
                        </Link>
                        <Link href="/cek-status" className={styles.linkItemAlt}>
                            <Search size={14} /> Cek Status Booking Tanpa Login
                        </Link>
                    </div>

                    <div className={styles.rightFooter}>
                        <Lock size={12} />
                        <span>Sistem Terproteksi Autentikasi Supabase SSL 256-bit</span>
                    </div>
                </div>
            </div>
        </main>
    );
}