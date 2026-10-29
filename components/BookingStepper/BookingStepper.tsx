import React from 'react';
import { Clock, Lock } from 'lucide-react';
import styles from './BookingStepper.module.css';

interface BookingStepperProps {
    currentStep: number;
}

export default function BookingStepper({ currentStep }: BookingStepperProps) {
    const steps = [
        { num: 1, label: 'Pilih Jadwal' },
        { num: 2, label: 'Data Pemesan' },
        { num: 3, label: 'Pembayaran' },
    ];

    return (
        <div className={styles.container}>
            <div className={styles.stepperGroup}>
                {steps.map((step, idx) => (
                    <React.Fragment key={step.num}>
                        <div className={`${styles.stepItem} ${currentStep >= step.num ? styles.active : ''}`}>
                            <span className={styles.stepNum}>{step.num}</span>
                            <span className={styles.stepLabel}>{step.label}</span>
                        </div>
                        {idx < steps.length - 1 && <div className={styles.stepDivider} />}
                    </React.Fragment>
                ))}
            </div>

            <div className={styles.timerBadge}>
                <Clock size={14} />
                <span>Slot terkunci 15 menit setelah waktu dipilih</span>
            </div>
        </div>
    );
}