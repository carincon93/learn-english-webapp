import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export default function DynamicIsland({ children }: { children: React.ReactNode, key?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLUListElement>(null);

    useLayoutEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline();

            // 1. Start as a small circle (since height is 48px and border-radius is 10rem)
            tl.set(containerRef.current, {
                width: 48,
                opacity: 0,
                scale: 0.5
            })
                // 2. Pop in and fade in
                .to(containerRef.current, {
                    opacity: 1,
                    scale: 1,
                    duration: 0.5,
                    ease: "back.out(1.7)"
                })
                // 3. Expand to full width (20%)
                .to(containerRef.current, {
                    width: "20%",
                    duration: 0.6,
                    ease: "expo.out"
                }, "-=0.1")
                // 4. Reveal content
                .to(contentRef.current, {
                    opacity: 1,
                    duration: 0.3
                }, "-=0.2");
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <nav className="dynamic-island" ref={containerRef}>
            <ul className="dynamic-island__content" ref={contentRef}>
                <li>
                    <a href="/" className="dynamic-island__title">Weird <small style={{ fontSize: '0.8rem' }}>English</small></a>
                </li>
                {children}
            </ul>
        </nav>
    );
}