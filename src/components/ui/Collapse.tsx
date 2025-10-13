import React, { useEffect, useRef, useState } from "react";

type CollapseProps = {
  isOpen: boolean;
  children: React.ReactNode;
  durationMs?: number;
  lazy?: boolean;
  className?: string;
  ariaId?: string;
};

export default function Collapse({
  isOpen,
  children,
  durationMs = 300,
  lazy = true,
  className = "",
  ariaId,
}: CollapseProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const listenerRef = useRef<((e: TransitionEvent) => void) | null>(null);
  const [mounted, setMounted] = useState(!lazy);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    console.log('🟡 Collapse: isOpen changed to', isOpen, '| mounted:', mounted);
    if (isOpen && !mounted) {
      console.log('🟡 Collapse: Setting mounted to true');
      setMounted(true);
    }
  }, [isOpen, mounted]);

  useEffect(() => {
    const el = wrapperRef.current;
    console.log('🟠 Collapse: Main effect triggered | isOpen:', isOpen, '| mounted:', mounted, '| el:', el ? 'exists' : 'NULL');
    if (!el) {
      console.log('🔴 Collapse: Element ref is NULL, aborting');
      return;
    }
    if (!mounted) {
      console.log('🔴 Collapse: Not mounted yet, aborting');
      return;
    }

    const cleanup = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (listenerRef.current) {
        el.removeEventListener("transitionend", listenerRef.current);
        listenerRef.current = null;
      }
    };

    const runOpen = () => {
      cleanup();
      
      console.log('🔵 Collapse runOpen: Starting animation');
      el.style.height = "0px";
      el.style.opacity = "0";
      el.style.overflow = "hidden";

      el.offsetHeight;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        
        if (!el) return;
        
        const target = el.scrollHeight;
        console.log('🔵 Collapse runOpen: Measured scrollHeight =', target, 'px');

        el.style.transition = `height ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${durationMs}ms ease-out`;
        el.style.height = `${target}px`;
        el.style.opacity = "1";
        setAnimating(true);
        console.log('🔵 Collapse runOpen: Animation started, transitioning to', target, 'px');

        const onEnd = (e: TransitionEvent) => {
          if (e.propertyName !== "height") return;
          if (!el) return;
          
          el.style.height = "auto";
          el.style.overflow = "visible";
          setAnimating(false);
          
          if (listenerRef.current) {
            el.removeEventListener("transitionend", listenerRef.current);
            listenerRef.current = null;
          }
        };
        
        listenerRef.current = onEnd;
        el.addEventListener("transitionend", onEnd);
      });
    };

    const runClose = () => {
      cleanup();
      
      if (!el) return;
      
      el.style.overflow = "hidden";
      el.style.height = `${el.scrollHeight}px`;

      el.offsetHeight;

      el.style.transition = `height ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${durationMs}ms ease-out`;
      el.style.height = "0px";
      el.style.opacity = "0";
      setAnimating(true);

      const onEnd = (e: TransitionEvent) => {
        if (e.propertyName !== "height") return;
        setAnimating(false);
        
        if (listenerRef.current && el) {
          el.removeEventListener("transitionend", listenerRef.current);
          listenerRef.current = null;
        }
      };
      
      listenerRef.current = onEnd;
      el.addEventListener("transitionend", onEnd);
    };

    if (isOpen) {
      runOpen();
    } else {
      if (!mounted) return;
      runClose();
    }

    return cleanup;
  }, [isOpen, mounted, durationMs]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    
    if (!mounted && !isOpen) {
      el.style.height = "0px";
      el.style.opacity = "0";
      el.style.overflow = "hidden";
    }
  }, [mounted, isOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      const el = wrapperRef.current;
      if (el) {
        el.style.transition = "none";
        el.style.height = isOpen ? "auto" : "0px";
        el.style.opacity = isOpen ? "1" : "0";
      }
    }
  }, [isOpen]);

  if (!mounted && !isOpen) {
    console.log('⚫ Collapse: Not rendering (not mounted and not open)');
    return null;
  }

  console.log('✅ Collapse: Rendering component | isOpen:', isOpen, '| mounted:', mounted);
  return (
    <div
      ref={wrapperRef}
      aria-hidden={!isOpen}
      aria-expanded={isOpen}
      aria-controls={ariaId}
      className={className}
      style={{
        willChange: animating ? "height, opacity" : undefined,
      }}
    >
      <div id={ariaId}>{children}</div>
    </div>
  );
}
