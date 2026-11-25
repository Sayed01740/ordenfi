"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

export type MagneticButtonProps<T extends React.ElementType = "button"> = {
  as?: T;
  strength?: number;
  rotationStrength?: number;
  className?: string;
  children?: React.ReactNode;
} & React.ComponentPropsWithRef<T>;

export const MagneticButton = React.forwardRef(
  <T extends React.ElementType = "button">(
    {
      className,
      children,
      as,
      strength = 0.35,
      rotationStrength = 0.08,
      ...props
    }: MagneticButtonProps<T>,
    forwardedRef: React.ForwardedRef<any>
  ) => {
    const Component = (as || "button") as React.ElementType;
    const localRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const element = localRef.current;
      if (!element) return;

      // Check prefers-reduced-motion
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const ctx = gsap.context(() => {
        const handleMouseMove = (e: MouseEvent) => {
          const rect = element.getBoundingClientRect();
          const currentX = (gsap.getProperty(element, "x") as number) || 0;
          const currentY = (gsap.getProperty(element, "y") as number) || 0;
          
          // Compute origin position ignoring current transform to prevent jitter loop
          const originLeft = rect.left - currentX;
          const originTop = rect.top - currentY;
          const centerX = originLeft + rect.width / 2;
          const centerY = originTop + rect.height / 2;
          
          const deltaX = e.clientX - centerX;
          const deltaY = e.clientY - centerY;

          gsap.to(element, {
            x: deltaX * strength,
            y: deltaY * strength,
            rotationX: -deltaY * rotationStrength,
            rotationY: deltaX * rotationStrength,
            scale: 1.03,
            ease: "power2.out",
            duration: 0.3,
            overwrite: "auto",
          });
        };

        const handleMouseLeave = () => {
          gsap.to(element, {
            x: 0,
            y: 0,
            rotationX: 0,
            rotationY: 0,
            scale: 1,
            ease: "elastic.out(1, 0.3)",
            duration: 1.1,
            overwrite: "auto",
          });
        };

        const handleMouseDown = () => {
          gsap.to(element, {
            scale: 0.96,
            duration: 0.15,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        const handleMouseUp = () => {
          gsap.to(element, {
            scale: 1.03,
            duration: 0.2,
            ease: "power2.out",
            overwrite: "auto",
          });
        };

        element.addEventListener("mousemove", handleMouseMove as EventListener);
        element.addEventListener("mouseleave", handleMouseLeave as EventListener);
        element.addEventListener("mousedown", handleMouseDown as EventListener);
        element.addEventListener("mouseup", handleMouseUp as EventListener);

        return () => {
          element.removeEventListener("mousemove", handleMouseMove as EventListener);
          element.removeEventListener("mouseleave", handleMouseLeave as EventListener);
          element.removeEventListener("mousedown", handleMouseDown as EventListener);
          element.removeEventListener("mouseup", handleMouseUp as EventListener);
        };
      }, element);

      return () => ctx.revert();
    }, [strength, rotationStrength]);

    return (
      <Component
        ref={(node: HTMLElement) => {
          (localRef as React.MutableRefObject<HTMLElement | null>).current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node;
        }}
        className={cn("cursor-pointer select-none will-change-transform", className)}
        style={{ transformStyle: "preserve-3d" }}
        {...props}
      >
        {children}
      </Component>
    );
  }
) as <T extends React.ElementType = "button">(
  props: MagneticButtonProps<T> & { ref?: React.ForwardedRef<any> }
) => React.ReactElement;
