"use client";

import { useId, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight, ArrowUpRight, ChevronRight, MessagesSquare, QrCode } from "lucide-react";
import { MagneticButton } from "@/components/ui/magnetic-button";
import styles from "./ordenfi-landing.module.css";

const features = [
  {
    title: "Swap & Bridge", description: "Exchange tokens on Arc or move USDC between networks.",
    icon: ArrowLeftRight, image: "/landing/swap-workspace.webp",
    caption: "Swap workspace", alt: "Ordenfi's Swap form with USDC and EURC selected",
    guide: "/docs#core-engine",
  },
  {
    title: "Send & Receive", description: "Send USDC or request it with a link or QR code.",
    icon: QrCode, image: "/landing/send-workspace.webp",
    caption: "Send workspace", alt: "Ordenfi's Send form with a sample 125 USDC payment and recipient",
    guide: "/docs#receive",
  },
  {
    title: "Kona", description: "Get help preparing a swap or payment for review.",
    icon: MessagesSquare, image: "/landing/kona-workspace.webp",
    caption: "Kona assistant", alt: "A sample conversation in Kona about using Arc Testnet",
    guide: "/docs#kona",
  },
];

export function LandingFeatureShowcase() {
  const id = useId();
  const panelId = `${id}-preview`;
  const [selected, setSelected] = useState(0);
  const feature = features[selected];

  function moveFocus(event: KeyboardEvent<HTMLElement>, index: number) {
    let next: number;
    if (event.key === "ArrowDown") next = (index + 1) % features.length;
    else if (event.key === "ArrowUp") next = (index - 1 + features.length) % features.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = features.length - 1;
    else return;
    event.preventDefault();
    setSelected(next);
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div className={styles.showcase}>
      <div role="tablist" aria-label="Feature previews" aria-orientation="vertical" className={styles.featureTabs}>
        {features.map(({ title, description, icon: Icon }, index) => (
          <MagneticButton
            key={title}
            as="button"
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-label={title}
            aria-selected={selected === index}
            aria-controls={panelId}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => setSelected(index)}
            onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => moveFocus(event, index)}
            strength={0.15}
            className={styles.featureTab}
          >
            <Icon size={20} aria-hidden="true" />
            <span><strong>{title}</strong><small>{description}</small></span>
            <ChevronRight size={17} aria-hidden="true" />
          </MagneticButton>
        ))}
      </div>
      <div id={panelId} role="tabpanel" aria-labelledby={`${id}-tab-${selected}`} tabIndex={0} className={styles.showcasePanel}>
        <figure key={feature.title} className={styles.showcaseFigure}>
          <div className={styles.showcaseImage}>
            <Image src={feature.image} alt={feature.alt} fill sizes="(max-width: 51rem) 90vw, 650px" />
          </div>
          <figcaption className={styles.imageCaption}>
            <span>{feature.caption}</span>
            <MagneticButton as={Link} href={feature.guide} className={styles.textLink}>
              Read guide <ArrowUpRight size={14} aria-hidden="true" />
            </MagneticButton>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
