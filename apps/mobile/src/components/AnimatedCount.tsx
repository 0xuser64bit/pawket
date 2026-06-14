import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motion } from '../theme/tokens';
import { Text, type TextProps } from './Text';

/**
 * A number that tweens to its target instead of snapping, so a care action's
 * impact reads on the meter itself. Falls back to the final value instantly
 * when reduced motion is requested.
 */
export function AnimatedCount({
  value,
  duration = motion.slow,
  format = (n) => String(n),
  ...textProps
}: {
  value: number;
  duration?: number;
  format?: (n: number) => string;
} & Omit<TextProps, 'children'>) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = displayRef.current;
    if (reduced || from === value) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const startedAt = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (value - from) * eased);
      displayRef.current = next;
      setDisplay(next);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, duration, reduced]);

  return <Text {...textProps}>{format(display)}</Text>;
}
