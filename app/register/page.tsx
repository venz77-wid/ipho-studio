'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, ArrowRight, Lock, CheckCircle2, MailCheck } from 'lucide-react';
import { register } from './actions';
import styles from '../login/page.module.css';
import GoogleButton from '@/components/GoogleButton';

export default function RegisterPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [sentTo, setSentTo] = useState<string | null>(null);

    async function handleRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (isLoading) return;

        setErrorMessage('');

        if (password.length < 8) {
            setErrorMessage('Kata sandi minimal 8 karakter.');
            return;
        }
        if (password !== confirmPassword) {
            setErrorMessage('Konfirmasi kata sandi tidak sama.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await register(fullName, email, password, confirmPassword);

            if (!result.ok) {
                setErrorMessage(result.error);
                return;
            }

            if (result.needsEmailConfirmation) {
                setSentTo(email.trim());
                return;
            }

            // Konfirmasi email dimatikan: sesi sudah aktif
            window.location.replace('/');
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
                        <h2 className={styles.heading}>Mulai abadikan momen bersama kami.</h2>
                        <p className={styles.description}>
                            Buat akun untuk melakukan reservasi dan memantau paket foto kamu di IPHO Studio.
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
                    {sentTo ? (
                        <div className={styles.successBox} role="status">
                            <MailCheck size={40} aria-hidden />
                            <h2 className={styles.formTitle}>Cek email kamu</h2>
                            <p className={styles.formSubtitle}>
                                Kami mengirim link konfirmasi ke <strong>{sentTo}</strong>. Klik link tersebut
                                untuk mengaktifkan akun, lalu masuk.
                            </p>
                            <Link href="/login" className={styles.switchLink}>
                                Ke halaman masuk
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className={styles.formHeader}>
                                <span className={styles.areaBadge}>AKUN BARU IPHO</span>
                                <h2 className={styles.formTitle}>Daftar Akun</h2>
                                <p className={styles.formSubtitle}>
                                    Isi data berikut untuk membuat akun pelanggan.
                                </p>
                            </div>

                            <div className={styles.socialSingle}>
                                <GoogleButton className={styles.socialBtn} label="Daftar dengan Google" onError={setErrorMessage} />
                            </div>

                            <div className={styles.divider}>
                                <span>ATAU DENGAN EMAIL</span>
                            </div>

                            <form onSubmit={handleRegister} className={styles.form} aria-busy={isLoading}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="fullName" className={styles.label}>NAMA LENGKAP</label>
                                    <input
                                        id="fullName"
                                        name="fullName"
                                        type="text"
                                        autoComplete="name"
                                        value={fullName}
                                        onChange={(event) => setFullName(event.target.value)}
                                        placeholder="Nama kamu"
                                        className={styles.input}
                                        disabled={isLoading}
                                        maxLength={100}
                                        required
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="email" className={styles.label}>EMAIL</label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="nama@email.com"
                                        className={styles.input}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="password" className={styles.label}>KATA SANDI</label>
                                    <div className={styles.passwordWrapper}>
                                        <input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            placeholder="Minimal 8 karakter"
                                            className={styles.input}
                                            disabled={isLoading}
                                            minLength={8}
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

                                <div className={styles.inputGroup}>
                                    <label htmlFor="confirmPassword" className={styles.label}>
                                        ULANGI KATA SANDI
                                    </label>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        placeholder="Ketik ulang kata sandi"
                                        className={styles.input}
                                        disabled={isLoading}
                                        required
                                    />
                                </div>

                                {errorMessage && (
                                    <p role="alert" style={{ color: '#b91c1c', fontSize: 14 }}>
                                        {errorMessage}
                                    </p>
                                )}

                                <button type="submit" disabled={isLoading} className={styles.submitBtn}>
                                    {isLoading ? 'Memproses...' : 'Daftar'}
                                    {!isLoading && <ArrowRight size={18} aria-hidden />}
                                </button>
                            </form>

                            <p className={styles.switchText}>
                                Sudah punya akun?{' '}
                                <Link href="/login" className={styles.switchLink}>Masuk</Link>
                            </p>
                        </>
                    )}

                    <div className={styles.rightFooter}>
                        <Lock size={12} aria-hidden />
                        <span>Akun pelanggan IPHO Studio</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
