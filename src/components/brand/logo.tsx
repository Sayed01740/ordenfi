import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = { variant?: "icon" | "full"; className?: string; height?: number; priority?: boolean };

export function BrandLogo({ variant = "icon", className, height = 36, priority = false }: BrandLogoProps) {
  return <span className={cn("ordenfi-logo inline-flex shrink-0 items-center gap-3", className)}>
    <Image src="/brand/ordenfi-logo.png" alt={variant === "icon" ? "Ordenfi" : ""} width={height} height={height} priority={priority} className="shrink-0 rounded-lg" />
    {variant === "full" && <span className="ordenfi-wordmark">Ordenfi</span>}
  </span>;
}
