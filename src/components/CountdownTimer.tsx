"use client";

import { useEffect, useRef, useState } from "react";

const pad = (n: number, size = 2) => String(n).padStart(size, "0");

/**
 * Contagem regressiva com centesimos, como no original.
 * O alvo e fixado na montagem (client-side) para nao divergir entre servidor e
 * cliente na hidratacao — por isso o primeiro render sai vazio.
 */
export function CountdownTimer({ hours = 11 }: { hours?: number }) {
  const deadline = useRef<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    deadline.current = Date.now() + hours * 60 * 60 * 1000;

    let frame: number;
    const tick = () => {
      setRemaining(Math.max(0, (deadline.current ?? 0) - Date.now()));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hours]);

  if (remaining === null) {
    return <span className="font-mono font-black tabular-nums">--:--:--</span>;
  }

  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const ms = Math.floor(remaining % 1000);

  return (
    <span className="font-mono font-black tabular-nums">
      {pad(h)} : {pad(m)} : {pad(s)} . {pad(ms, 3)}
    </span>
  );
}
