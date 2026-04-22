import { useEffect, useRef } from 'react';
import gsap from 'gsap';


interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!isOpen) return;
    }

    if (isOpen) {
      // Open animation
      gsap.to(overlayRef.current, {
        autoAlpha: 1,
        duration: 0.3,
        ease: 'power2.out'
      });
      gsap.to(contentRef.current, {
        x: 0,
        duration: 0.4,
        ease: 'power3.out'
      });
      // Disable body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Close animation
      gsap.to(overlayRef.current, {
        autoAlpha: 0,
        duration: 0.3,
        ease: 'power2.in'
      });
      gsap.to(contentRef.current, {
        x: '100%',
        duration: 0.4,
        ease: 'power3.in'
      });
      // Enable body scroll
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <div
        ref={overlayRef}
        className="drawer__overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        className="drawer__content"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="drawer__header">
          <h2 className="drawer__title">{title}</h2>
          <button className="drawer__close" onClick={onClose} aria-label="Close drawer">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="drawer__body">
          {children}
        </div>
      </div>
    </>
  );
}
