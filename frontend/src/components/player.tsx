"use client";
import { Headphones, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { clockTime } from "@/lib/utils";
import type { useMeetingPlayer } from "@/hooks/use-meeting-player";

export function Player({
  player,
  duration,
}: {
  player: ReturnType<typeof useMeetingPlayer>;
  duration: number;
}) {
  return (
    <section className="player panel" aria-label="Simulated meeting player">
      <div className="player-label">
        <span>
          <Headphones size={15} />
          Meeting playback
        </span>
        <span className="demo-pill">Simulated · No audio</span>
      </div>
      <div className="player-controls">
        <button
          className="play-button"
          onClick={player.toggle}
          aria-label={player.playing ? "Pause playback" : "Play meeting"}
        >
          {player.playing ? (
            <Pause size={22} fill="currentColor" />
          ) : (
            <Play size={22} fill="currentColor" />
          )}
        </button>
        <button
          className="icon-button skip-button"
          aria-label="Skip back 10 seconds"
          onClick={() => player.seek(player.currentTime - 10)}
        >
          <RotateCcw size={20} />
          <small>10</small>
        </button>
        <button
          className="icon-button skip-button"
          aria-label="Skip forward 10 seconds"
          onClick={() => player.seek(player.currentTime + 10)}
        >
          <RotateCw size={20} />
          <small>10</small>
        </button>
        <span className="time-current" data-testid="current-time">
          {clockTime(player.currentTime)}
        </span>
        <div className="wave-seek">
          <div className="waveform" aria-hidden="true">
            {Array.from({ length: 100 }, (_, i) => (
              <i
                key={i}
                className={
                  i / 100 <= player.currentTime / duration ? "played" : ""
                }
                style={{ height: `${18 + ((i * 17 + i * i * 7) % 31)}px` }}
              />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={player.currentTime}
            onChange={(e) => player.seek(Number(e.target.value))}
            aria-label="Seek meeting playback"
            aria-valuetext={clockTime(player.currentTime)}
          />
        </div>
        <span className="time-total">{clockTime(duration)}</span>
        <select
          className="rate-select"
          aria-label="Playback speed"
          value={player.rate}
          onChange={(e) => player.setRate(Number(e.target.value))}
        >
          {[0.75, 1, 1.25, 1.5, 2].map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
