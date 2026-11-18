'use client';

import { useEffect, useId, useRef } from 'react';
import { MoreVertical } from 'lucide-react';
import styles from './AdminRowAction.module.css';

interface Props {
    label: string;
    action: string;
    onAction: () => void;
    disabled?: boolean;
    danger?: boolean;
}

export default function AdminRowAction({ label, action, onAction, disabled, danger }: Props) {
    const id = useId();
    const trigger = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const menu = panel.current;
        const button = trigger.current;
        if (!menu || !button) return;

        function position() {
            if (!menu || !button || !menu.matches(':popover-open')) return;

            const anchor = button.getBoundingClientRect();
            const { offsetWidth: width, offsetHeight: height } = menu;
            const viewport = document.documentElement;
            const edge = 8;
            const gap = 6;
            const below = anchor.bottom + gap;
            const top = below + height + edge <= viewport.clientHeight
                ? below
                : anchor.top - gap - height;
            menu.style.left = `${Math.max(edge, Math.min(anchor.right - width, viewport.clientWidth - width - edge))}px`;
            menu.style.top = `${Math.max(edge, top)}px`;
        }

        function closeOnScroll() {
            if (menu?.matches(':popover-open')) menu.hidePopover();
        }

        function onToggle(event: Event) {
            window.removeEventListener('resize', position);
            window.removeEventListener('scroll', closeOnScroll, true);
            if ((event as ToggleEvent).newState === 'open') {
                position();
                window.addEventListener('resize', position);
                window.addEventListener('scroll', closeOnScroll, true);
            }
        }

        menu.addEventListener('toggle', onToggle);
        return () => {
            menu.removeEventListener('toggle', onToggle);
            window.removeEventListener('resize', position);
            window.removeEventListener('scroll', closeOnScroll, true);
        };
    }, []);

    return (
        <div className={styles.root}>
            <button ref={trigger} type="button" className={styles.trigger} popoverTarget={id}
                aria-label={label} disabled={disabled}>
                <MoreVertical size={17} aria-hidden />
            </button>
            <div ref={panel} id={id} popover="auto" className={styles.panel}>
                <button type="button" className={styles.action} data-danger={danger} disabled={disabled}
                    onClick={() => {
                        panel.current?.hidePopover();
                        onAction();
                    }}>
                    {action}
                </button>
            </div>
        </div>
    );
}
