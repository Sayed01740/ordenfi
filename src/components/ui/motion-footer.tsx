"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Rocket, BookOpen, ArrowUp } from "lucide-react";
import { MagneticButton, type MagneticButtonProps } from "@/components/ui/magnetic-button";

export { MagneticButton, type MagneticButtonProps };

// Register ScrollTrigger safely for React
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// -------------------------------------------------------------------------
// 1. THEME-ADAPTIVE INLINE STYLES (Current Theme Synchronized & Blended)
// -------------------------------------------------------------------------
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

.cinematic-footer-wrapper {
  font-family: var(--font-sans, 'Plus Jakarta Sans', sans-serif);
  -webkit-font-smoothing: antialiased;
  
  /* Fallbacks linking to current theme tokens */
  --c-fg: var(--color-foreground, var(--foreground, #eeeef0));
  --c-bg: var(--color-background, var(--background, #111315));
  --c-primary: var(--color-primary, var(--primary, #b9fa0a));
  --c-secondary: var(--color-secondary, var(--secondary, #252a2e));
  --c-accent: var(--color-accent, var(--accent, #b9fa0a));
  --c-destructive: var(--color-danger, var(--destructive, #ee9b98));
  --c-border: var(--color-border, var(--border, #353b40));

  /* Dynamic Glass Pill Variables matching current theme */
  --pill-bg-1: color-mix(in oklch, var(--c-fg) 4%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--c-fg) 1.5%, transparent);
  --pill-shadow: color-mix(in oklch, var(--c-bg) 60%, transparent);
  --pill-highlight: color-mix(in oklch, var(--c-fg) 12%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--c-bg) 85%, transparent);
  --pill-border: color-mix(in oklch, var(--c-fg) 10%, transparent);
  
  --pill-bg-1-hover: color-mix(in oklch, var(--c-fg) 10%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--c-fg) 3%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--c-primary) 40%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--c-primary) 25%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--c-primary) 35%, transparent);
}

@keyframes footer-breathe {
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.45; }
  100% { transform: translate(-50%, -50%) scale(1.12); opacity: 0.85; }
}

@keyframes footer-scroll-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes footer-heartbeat {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 5px color-mix(in oklch, var(--c-destructive) 50%, transparent)); }
  15%, 45% { transform: scale(1.2); filter: drop-shadow(0 0 10px color-mix(in oklch, var(--c-destructive) 80%, transparent)); }
  30% { transform: scale(1); }
}

.animate-footer-breathe {
  animation: footer-breathe 8s ease-in-out infinite alternate;
}

.animate-footer-scroll-marquee {
  animation: footer-scroll-marquee 35s linear infinite;
}

.animate-footer-heartbeat {
  animation: footer-heartbeat 2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
}

/* Theme-adaptive Grid Background with top/bottom soft fade */
.footer-bg-grid {
  background-size: 56px 56px;
  background-image: 
    linear-gradient(to right, color-mix(in oklch, var(--c-fg) 4%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in oklch, var(--c-fg) 4%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
}

/* Theme-adaptive Aurora Glow using current Primary & Secondary tokens */
.footer-aurora {
  background: radial-gradient(
    circle at 50% 50%, 
    color-mix(in oklch, var(--c-primary) 16%, transparent) 0%, 
    color-mix(in oklch, var(--c-accent) 12%, transparent) 35%, 
    color-mix(in oklch, var(--c-secondary) 14%, transparent) 55%, 
    transparent 75%
  );
}

/* Glass Pill Theming */
.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow: 
      0 10px 30px -10px var(--pill-shadow), 
      inset 0 1px 1px var(--pill-highlight), 
      inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.footer-glass-pill:hover {
  background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%);
  border-color: var(--pill-border-hover);
  box-shadow: 
      0 20px 40px -10px var(--pill-shadow-hover), 
      inset 0 1px 1px var(--pill-highlight-hover);
  color: var(--c-fg);
}

/* Giant Background Text Masking */
.footer-giant-bg-text {
  font-size: 20vw;
  line-height: 0.75;
  font-weight: 900;
  letter-spacing: -0.05em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in oklch, var(--c-fg) 5%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--c-fg) 10%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text;
  background-clip: text;
}

/* Metallic Text Glow */
.footer-text-glow {
  background: linear-gradient(180deg, var(--c-fg) 0%, color-mix(in oklch, var(--c-fg) 45%, transparent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0px 0px 24px color-mix(in oklch, var(--c-primary) 18%, transparent));
}
`;


// -------------------------------------------------------------------------
// 3. MAIN COMPONENT (Theme & Brand Configurable, Seamlessly Blended)
// -------------------------------------------------------------------------
interface CinematicFooterProps {
  brandName?: string;
  heading?: string;
  subheading?: string;
  topSlot?: React.ReactNode;
  primaryActionUrl?: string;
  primaryActionLabel?: string;
  docsUrl?: string;
  variant?: "blended" | "curtain";
  className?: string;
}

const MarqueeItem = () => (
  <div className="flex items-center space-x-10 px-6">
    <span>Instant Settlement</span> <span className="text-primary font-bold">✦</span>
    <span>Native USDC Gas</span> <span className="text-accent font-bold">✦</span>
    <span>Sub-Second Finality</span> <span className="text-primary font-bold">✦</span>
    <span>Automated Batch Payroll</span> <span className="text-accent font-bold">✦</span>
    <span>AI Financial Operator</span> <span className="text-primary font-bold">✦</span>
    <span>Universal Router & Permit2</span> <span className="text-primary font-bold">✦</span>
  </div>
);

export function CinematicFooter({
  brandName = "ORDENFI",
  heading = "Ready to begin?",
  subheading,
  topSlot,
  primaryActionUrl = "/app",
  primaryActionLabel = "Launch App",
  docsUrl = "/docs",
  variant = "blended",
  className,
}: CinematicFooterProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!wrapperRef.current) return;

    // React strict mode compatible GSAP context cleanup
    const ctx = gsap.context(() => {
      // Background Parallax
      gsap.fromTo(
        giantTextRef.current,
        { y: "6vh", scale: 0.9, opacity: 0 },
        {
          y: "0vh",
          scale: 1,
          opacity: 1,
          ease: "power1.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 85%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );

      // Staggered Content Reveal
      gsap.fromTo(
        [headingRef.current, linksRef.current],
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: {
            trigger: wrapperRef.current,
            start: "top 60%",
            end: "bottom bottom",
            scrub: 1,
          },
        }
      );
    }, wrapperRef);

    return () => ctx.revert();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const footerInner = (
    <div className="relative flex w-full flex-col justify-between overflow-hidden text-foreground cinematic-footer-wrapper">
      {/* Soft Top Blend Gradient into preceding page content */}
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[var(--c-bg)] via-[var(--c-bg)]/80 to-transparent pointer-events-none z-10" />

      {/* Ambient Light & Grid Background */}
      <div className="footer-aurora absolute left-1/2 top-1/3 h-[50vh] w-[75vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[90px] pointer-events-none z-0" />
      <div className="footer-bg-grid absolute inset-0 z-0 pointer-events-none" />

      {/* Giant background brand text with subtle parallax */}
      <div
        ref={giantTextRef}
        className="footer-giant-bg-text absolute bottom-[1vh] left-1/2 -translate-x-1/2 whitespace-nowrap z-0 pointer-events-none select-none"
      >
        {brandName}
      </div>

      {/* 1. Diagonal Sleek Marquee (Top of footer) */}
      <div className="relative w-full overflow-hidden border-y border-border/40 bg-background/50 backdrop-blur-md py-3.5 z-10 -rotate-1 scale-105 shadow-xl mb-8 md:mb-12">
        <div className="flex w-max animate-footer-scroll-marquee text-xs md:text-sm font-bold tracking-[0.25em] text-muted-foreground uppercase">
          <MarqueeItem />
          <MarqueeItem />
        </div>
      </div>

      {/* 2. Main Center Content with optional Mascot & Actions */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-4xl mx-auto text-center mb-12 md:mb-16">
        {topSlot && <div className="mb-4">{topSlot}</div>}

        <h2
          ref={headingRef}
          className="text-4xl sm:text-5xl md:text-7xl font-black footer-text-glow tracking-tighter mb-3 text-center"
        >
          {heading}
        </h2>

        {subheading && (
          <p className="text-muted-foreground text-xs sm:text-sm md:text-base max-w-md mb-8 text-center leading-relaxed">
            {subheading}
          </p>
        )}

        {/* Interactive Magnetic Pills Layout */}
        <div ref={linksRef} className="flex flex-col items-center gap-5 w-full mt-2">
          {/* Primary Launch Action & Docs */}
          <div className="flex flex-wrap justify-center gap-3.5 w-full">
            <MagneticButton as={Link} href={primaryActionUrl} className="footer-glass-pill px-8 md:px-10 py-3.5 md:py-4 rounded-full text-foreground font-bold text-sm md:text-base flex items-center gap-3 group">
              <Rocket className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <span>{primaryActionLabel}</span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </MagneticButton>
            
            <MagneticButton as={Link} href={docsUrl} className="footer-glass-pill px-8 md:px-10 py-3.5 md:py-4 rounded-full text-foreground font-bold text-sm md:text-base flex items-center gap-3 group">
              <BookOpen className="w-5 h-5 text-accent group-hover:scale-110 transition-transform" />
              <span>Documentation</span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </MagneticButton>
          </div>

          {/* Secondary Navigation Links */}
          <div className="flex flex-wrap justify-center gap-2.5 md:gap-4 w-full mt-1">
            <MagneticButton as="a" href="#features" className="footer-glass-pill px-5 py-2.5 rounded-full text-muted-foreground font-medium text-xs md:text-sm hover:text-foreground">
              Features
            </MagneticButton>
            <MagneticButton as="a" href="#workflow" className="footer-glass-pill px-5 py-2.5 rounded-full text-muted-foreground font-medium text-xs md:text-sm hover:text-foreground">
              How it works
            </MagneticButton>
            <MagneticButton as="a" href="#use-cases" className="footer-glass-pill px-5 py-2.5 rounded-full text-muted-foreground font-medium text-xs md:text-sm hover:text-foreground">
              Use cases
            </MagneticButton>
            <MagneticButton as={Link} href="/docs#bridge" className="footer-glass-pill px-5 py-2.5 rounded-full text-muted-foreground font-medium text-xs md:text-sm hover:text-foreground">
              Bridge Routes
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* 3. Bottom Bar / Credits */}
      <div className="relative z-20 w-full pb-6 md:pb-8 px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 border-t border-border/30 pt-6">
        {/* Copyright */}
        <div className="text-muted-foreground text-[10px] md:text-xs font-semibold tracking-widest uppercase order-2 md:order-1">
          © 2026 {brandName}. Built for Arc Network with Circle USDC.
        </div>

        {/* "Made with Love" Badge */}
        <div className="footer-glass-pill px-5 py-2 rounded-full flex items-center gap-2 order-1 md:order-2 cursor-default border-border/40">
          <span className="text-muted-foreground text-[10px] md:text-xs font-bold uppercase tracking-widest">Built with</span>
          <span className="animate-footer-heartbeat text-sm md:text-base text-destructive">❤</span>
          <span className="text-muted-foreground text-[10px] md:text-xs font-bold uppercase tracking-widest">on</span>
          <span className="text-foreground font-black text-xs md:text-sm tracking-normal ml-1">Arc Network</span>
        </div>

        {/* Back to top */}
        <MagneticButton
          as="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="w-10 h-10 md:w-11 md:h-11 rounded-full footer-glass-pill flex items-center justify-center text-muted-foreground hover:text-foreground group order-3"
        >
          <ArrowUp className="w-4 h-4 md:w-5 md:h-5 transform group-hover:-translate-y-1 transition-transform duration-300" />
        </MagneticButton>
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {variant === "curtain" ? (
        <div
          ref={wrapperRef}
          className={cn("relative h-screen w-full", className)}
          style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
        >
          <footer className="fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden bg-background">
            {footerInner}
          </footer>
        </div>
      ) : (
        <footer
          ref={wrapperRef}
          className={cn(
            "relative w-full bg-background pt-8 pb-4 md:pt-12 md:pb-6 overflow-hidden",
            className
          )}
        >
          {footerInner}
        </footer>
      )}
    </>
  );
}
