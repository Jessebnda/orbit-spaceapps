"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Mounts children only while on screen, so off-screen charts cost nothing. */
export function InView({ height, children }: { height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ height }}>
      {visible ? children : null}
    </div>
  );
}
