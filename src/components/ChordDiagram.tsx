import { CHORD_FINGERINGS } from "../core/arrangements";
import type { ChordName } from "../core/types";
export function ChordDiagram({ chord }: { chord: ChordName }) {
  const frets = CHORD_FINGERINGS[chord];
  return (
    <svg
      className="chord-diagram"
      viewBox="0 0 150 155"
      role="img"
      aria-label={`${chord} chord fingering, low E to high E: ${frets.map((f) => (f < 0 ? "muted" : f === 0 ? "open" : `fret ${f}`)).join(", ")}`}
    >
      {[0, 1, 2, 3, 4].map((f) => (
        <line
          key={`f${f}`}
          x1="25"
          x2="125"
          y1={35 + f * 23}
          y2={35 + f * 23}
          stroke="currentColor"
          strokeWidth={f === 0 ? 4 : 1}
          opacity={f === 0 ? 0.9 : 0.3}
        />
      ))}
      {frets.map((f, s) => (
        <g key={s}>
          <line
            x1={25 + s * 20}
            x2={25 + s * 20}
            y1="35"
            y2="127"
            stroke="currentColor"
            opacity=".4"
          />
          {f > 0 ? (
            <circle
              cx={25 + s * 20}
              cy={35 + (f - 0.5) * 23}
              r="7"
              fill="var(--amber)"
            />
          ) : (
            <text
              x={25 + s * 20}
              y="23"
              textAnchor="middle"
              fill="currentColor"
              fontSize="13"
            >
              {f < 0 ? "×" : "○"}
            </text>
          )}
          <text
            x={25 + s * 20}
            y="147"
            textAnchor="middle"
            fill="currentColor"
            opacity=".5"
            fontSize="10"
          >
            {["E", "A", "D", "G", "B", "e"][s]}
          </text>
        </g>
      ))}
    </svg>
  );
}
