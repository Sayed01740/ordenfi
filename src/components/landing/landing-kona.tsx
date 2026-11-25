"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { AssistantRobot } from "@/components/workspace/assistant-robot";
import { MagneticButton } from "@/components/ui/magnetic-button";
import styles from "./ordenfi-landing.module.css";

const KonaPlayback = createContext<{ paused: boolean; toggle: () => void } | null>(null);

const poses = {
  hello: "wave",
  scout: "scan",
  guide: "point",
  courier: "carry",
  farewell: "nod",
} as const;

export function LandingKonaMotion({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setPageHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return (
    <KonaPlayback.Provider value={{ paused, toggle: () => setPaused(current => !current) }}>
      <div className={styles.landing} data-kona-paused={paused || pageHidden || undefined}>
        {children}
      </div>
    </KonaPlayback.Provider>
  );
}

export function KonaMotionToggle() {
  const playback = useContext(KonaPlayback);
  if (!playback) return null;

  const label = playback.paused ? "Resume Kona animation" : "Pause Kona animation";
  const Icon = playback.paused ? Play : Pause;
  return (
    <MagneticButton
      as="button"
      type="button"
      className={styles.konaMotionControl}
      aria-label={label}
      title={label}
      onClick={playback.toggle}
      strength={0.25}
    >
      <Icon size={16} aria-hidden="true" />
    </MagneticButton>
  );
}

export function LandingKona({ scene }: { scene: keyof typeof poses }) {
  const stage = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = stage.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={stage} className={styles.konaStage} data-landing-kona={scene} data-in-view={inView || undefined}>
      {scene === "hello" && <span className={styles.konaGreeting}>Hi, I’m Kona.</span>}
      <div className={styles.konaPose}>
        <AssistantRobot mood="idle" pose={poses[scene]} />
      </div>
    </div>
  );
}
