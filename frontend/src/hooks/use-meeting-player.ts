"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Segment } from "@/lib/types";

export function useMeetingPlayer(duration: number, segments: Segment[]) {
  const [position, setCurrentTime] = useState(0);
  const currentTime = Math.min(position, duration);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;
      setCurrentTime((t) => Math.min(duration, t + delta * rate));
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, rate, duration]);
  const atEnd = currentTime >= duration;
  // Playback stops at the boundary; toggling from the end starts a fresh playback.
  useEffect(() => {
    if (atEnd && playing) {
      const timer = window.setTimeout(() => setPlaying(false), 0);
      return () => window.clearTimeout(timer);
    }
  }, [atEnd, playing]);
  const seek = useCallback(
    (seconds: number) =>
      setCurrentTime(Math.max(0, Math.min(duration, seconds))),
    [duration],
  );
  const toggle = useCallback(() => {
    if (currentTime >= duration) {
      setCurrentTime(0);
      setPlaying(true);
    } else setPlaying((p) => !p);
  }, [currentTime, duration]);
  const activeId = useMemo(
    () =>
      segments.find(
        (s) => currentTime >= s.start_seconds && currentTime < s.end_seconds,
      )?.id ?? null,
    [currentTime, segments],
  );
  return {
    currentTime,
    playing: playing && !atEnd,
    rate,
    setRate,
    seek,
    toggle,
    activeId,
  };
}
