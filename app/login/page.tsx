'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { login } from './actions';
import styles from './page.module.css';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isLoading) return;

        setErrorMessage('');
        setIsLoading(true);

        try {
            const result = await login(email, password);

            if (!result.ok) {
                setErrorMessage(result.error);
                return;
            }

            // Cookie sesi sudah ditulis oleh Server Action sebelum pindah halaman
            window.location.replace(result.destination);
        } catch {
            setErrorMessage('Tidak dapat menghubungi server. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className={styles.wrapper}>
            <div className={styles.card}>
                <div className={styles.leftPanel}>
                    <div className={styles.brandWrapper}>
                        <h1 className={styles.logo}>IPHO STUDIO</h1>
                        <span className={styles.portalBadge}>PORTAL</span>
                    </div>

                    <div className={styles.leftContent}>
                        <span className={styles.subtitle}>DOKUMENTASI &amp; ESTETIKA</span>
                        <h2 className={styles.heading}>Abadikan momen terbaik bersama kami.</h2>
                        <p className={styles.description}>
                            Masuk ke akun untuk mengakses layanan dan reservasi IPHO Studio.
                        </p>
                    </div>

                    <div className={styles.leftFooter}>
                        <div className={styles.secureText}>
                            <CheckCircle2 size={16} aria-hidden />
                            <span>IPHO Studio</span>
                        </div>
                    </div>
                </div>

                <div className={styles.rightPanel}>
                    <div className={styles.formHeader}>
                        <span className={styles.areaBadge}>AKSES AKUN IPHO</span>
                        <h2 className={styles.formTitle}>Masuk Akun</h2>
                        <p className={styles.formSubtitle}>
                            Gunakan email dan kata sandi akunmu untuk melanjutkan.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className={styles.form} aria-busy={isLoading}>
                        <div className={styles.inputGroup}>
                            <label htmlFor="email" className={styles.label}>EMAIL</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="username"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="nama@email.com"
                                className={styles.input}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <div className={styles.labelRow}>
                                <label htmlFor="password" className={styles.label}>KATA SANDI</label>
                            </div>
                            <div className={styles.passwordWrapper}>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Masukkan kata sandi"
                                    className={styles.input}
                                    disabled={isLoading}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((previous) => !previous)}
                                    className={styles.eyeBtn}
                                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {errorMessage && (
                            <p role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>
                                {errorMessage}
                            </p>
                        )}

                        <button type="submit" disabled={isLoading} className={styles.submitBtn}>
                            {isLoading ? 'Memproses...' : 'Masuk'}
                            {!isLoading && <ArrowRight size={18} aria-hidden />}
                        </button>
                    </form>

                    <p className={styles.switchText}>
                        Belum punya akun?{' '}
                        <Link href="/register" className={styles.switchLink}>Daftar</Link>
                    </p>

                    <div className={styles.rightFooter}>
                        <Lock size={12} aria-hidden />
                        <span>Akun pelanggan dan pengelola IPHO Studio</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
