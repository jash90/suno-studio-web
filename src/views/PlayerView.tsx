import { Disc3, SkipBack, SkipForward, Square } from "lucide-react";
import Waveform from "../components/Waveform";
import { Playback } from "../types";

interface Props {
  playback: Playback | null;
  onSeekTo: (index: number) => void; // indeks spoza zakresu = stop
  onStop: () => void;
}

/** Zakładka Odtwarzacz: bieżąca pozycja, sterowanie i pełna kolejka. */
export default function PlayerView({ playback, onSeekTo, onStop }: Props) {
  if (!playback) {
    return (
      <div className="view">
        <p className="empty">
          Nic nie gra — uruchom album przyciskiem „Odtwórz album" w Bibliotece.
        </p>
      </div>
    );
  }
  const item = playback.queue[playback.index];
  return (
    <div className="view">
      <h2>
        <Disc3 size={14} /> {playback.name}
      </h2>
      <div className="album-player standalone">
        <div className="album-player-bar">
          <button
            className="btn-icon"
            title="Poprzedni"
            disabled={playback.index === 0}
            onClick={() => onSeekTo(playback.index - 1)}
          >
            <SkipBack size={16} />
          </button>
          <button
            className="btn-icon"
            title="Następny"
            onClick={() => onSeekTo(playback.index + 1)}
          >
            <SkipForward size={16} />
          </button>
          <span className="album-player-now">
            {playback.index + 1}/{playback.queue.length} · {item.label}
          </span>
          <button className="btn-icon" title="Zatrzymaj" onClick={onStop}>
            <Square size={16} />
          </button>
        </div>
        <div className="album-player-bar">
          <Waveform
            key={playback.index}
            url={item.url}
            onFinish={() => onSeekTo(playback.index + 1)}
          />
        </div>
        <ol className="album-queue open">
          {playback.queue.map((q, i) => (
            <li key={i}>
              <button
                className={i === playback.index ? "active" : ""}
                onClick={() => onSeekTo(i)}
              >
                {i === playback.index ? "▸ " : ""}
                {q.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
