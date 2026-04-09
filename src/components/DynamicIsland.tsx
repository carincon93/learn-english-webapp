import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export default function DynamicIsland({ children }: { children: React.ReactNode, key?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const mm = gsap.matchMedia();

        mm.add({
            isMobile: "(max-width: 767px)",
            isTablet: "(min-width: 768px) and (max-width: 1023px)",
            isDesktop: "(min-width: 1024px)"
        }, (context) => {
            const { isMobile, isTablet } = context.conditions as any;
            const targetWidth = isMobile ? "90%" : isTablet ? "50%" : "30%";

            const tl = gsap.timeline();

            tl.set(containerRef.current, {
                width: 48,
                opacity: 0,
                scale: 0.5
            })
                .to(containerRef.current, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.5,
                    ease: "back.out(1.7)"
                })
                .to(containerRef.current, {
                    width: targetWidth,
                    duration: 0.6,
                    ease: "expo.out"
                }, "-=0.1")
                .to(contentRef.current, {
                    opacity: 1,
                    duration: 0.3
                }, "-=0.2");

            return () => tl.kill();
        }, containerRef);

        return () => mm.revert();
    }, []);

    return (
        <nav className="dynamic-island" ref={containerRef}>
            <div className="dynamic-island__content" ref={contentRef}>
                <a href="/" className="dynamic-island__logo">Weird <small>English</small></a>
                {children}
            </div>
        </nav>
    );
}