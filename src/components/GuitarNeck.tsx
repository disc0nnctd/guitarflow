import { GUITAR_STRINGS, getFretMidi, midiLabel } from "../core/pitch";

interface GuitarNeckProps {
  targetMidi: number | null;
  heardMidi: number | null;
  onSelect: (midi: number) => void;
  targetPosition?: { string: number; fret: number };
}
export function GuitarNeck({
  targetMidi,
  heardMidi,
  onSelect,
  targetPosition,
}: GuitarNeckProps) {
  return (
    <div
      className="neck-scroll"
      role="region"
      aria-label="Guitar neck, frets zero through twelve"
      tabIndex={0}
    >
      <div className="guitar-neck">
        <div className="neck-frets" aria-hidden="true">
          <span>String</span>
          {Array.from({ length: 13 }, (_, fret) => (
            <span key={fret}>
              {fret === 0 ? "Open" : fret}
              {[3, 5, 7, 9, 12].includes(fret) && (
                <small>{fret === 12 ? "••" : "•"}</small>
              )}
            </span>
          ))}
        </div>
        {GUITAR_STRINGS.map((string) => (
          <div className="neck-string" key={string.number}>
            <span className="neck-string-name">
              {string.name}
              <small>
                {string.number === 1
                  ? "High"
                  : string.number === 6
                    ? "Low"
                    : `String ${string.number}`}
              </small>
            </span>
            {Array.from({ length: 13 }, (_, fret) => {
              const midi = getFretMidi(string.number, fret);
              const target = midi === targetMidi;
              const heard = midi === heardMidi;
              const suggested =
                target &&
                targetPosition?.string === string.number &&
                targetPosition.fret === fret;
              return (
                <button
                  type="button"
                  key={fret}
                  className={`neck-note${target ? " is-target" : ""}${heard ? " is-heard" : ""}${suggested ? " is-suggested" : ""}`}
                  aria-label={`${midiLabel(midi)}, string ${string.number}, ${fret === 0 ? "open string" : `fret ${fret}`}${suggested ? ", suggested fingering" : ""}`}
                  aria-pressed={target}
                  onClick={() => onSelect(midi)}
                >
                  <span>{midiLabel(midi)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
