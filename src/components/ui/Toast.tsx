import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';


export interface ToastEventDetail {
  message: string;
  type: 'success' | 'error' | 'partial' | 'retry';
}

export default function Toast() {
  const [toast, setToast] = useState<ToastEventDetail | null>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const handleToastEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ToastEventDetail>;
      // If we already have a toast, reset it first to trigger the in-animation for the new one
      setToast(null);
      setTimeout(() => {
        setToast(customEvent.detail);
      }, 10);
    };

    window.addEventListener('app:toast', handleToastEvent);
    return () => window.removeEventListener('app:toast', handleToastEvent);
  }, []);

  useEffect(() => {
    if (toast && toastRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);

      gsap.killTweensOf(toastRef.current);

      // Animation In
      gsap.fromTo(toastRef.current,
        {
          opacity: 0,
          y: 40,
          scale: 0.9,
          filter: 'blur(10px)'
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          duration: 0.5,
          ease: "back.out(1.7)"
        }
      );

      // Auto-hide after 4 seconds
      timerRef.current = setTimeout(() => {
        if (toastRef.current) {
          gsap.to(toastRef.current, {
            opacity: 0,
            y: 20,
            scale: 0.9,
            filter: 'blur(10px)',
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => setToast(null)
          });
        }
      }, 4000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      ref={toastRef}
      className={`toast toast--${toast.type}`}
      role="alert"
      aria-live="polite"
    >
      {toast.message}
    </div>
  );
}
