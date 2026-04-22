import React, { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import gsap from 'gsap';
import { isInputDrawerOpen, closeInputDrawer } from '../stores/uiStore';
import '../styles/BottomDrawer.css';

interface BottomDrawerProps {
  children: React.ReactNode;
}

const BottomDrawer: React.FC<BottomDrawerProps> = ({ children }) => {
  const isOpen = useStore(isInputDrawerOpen);
  const drawerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      gsap.to(overlayRef.current, {
        display: 'block',
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out'
      });

      gsap.to(drawerRef.current, {
        y: 0,
        duration: 0.7,
        ease: 'power4.out'
      });

      // Auto-focus first input
      setTimeout(() => {
        const firstInput = drawerRef.current?.querySelector('textarea, input') as HTMLElement;
        if (firstInput) firstInput.focus();
      }, 300);
    } else {
      document.body.style.overflow = '';

      gsap.to(drawerRef.current, {
        y: '100%',
        duration: 0.5,
        ease: 'power3.in'
      });

      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.4,
        onComplete: () => {
          if (overlayRef.current) overlayRef.current.style.display = 'none';
        }
      });
    }
  }, [isOpen]);

  return (
    <>
      <div
        ref={overlayRef}
        className={`drawer-overlay ${isOpen ? 'is-open' : ''}`}
        onClick={closeInputDrawer}
      />
      <div
        ref={drawerRef}
        className="drawer-container"
      >
        <div className="drawer-handle" />
        <div className="drawer-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default BottomDrawer;
