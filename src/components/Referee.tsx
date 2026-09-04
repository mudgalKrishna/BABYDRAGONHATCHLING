import { motion } from "framer-motion";
import type { Metrics } from "@/lib/mockEngine";
import { GRID_SIZE } from "@/lib/mockEngine";

interface RefereeProps {
  truth: number[];
  estimate: number[];
  metrics: Metrics;
}

export default function Referee({ truth, estimate, metrics }: RefereeProps) {
  return (
    <div className="flex flex-col gap-5 px-4 py-5 overflow-y-auto h-full">
      {/* Truth & Estimate grids */}
      <section>
        <h2 className="font-mono text-xs mb-3" style={{ color: "#A8A092" }}>
          truth vs estimate
        </h2>
        <div className="flex gap-3">
          <div>
            <p className="font-mono text-[10px] mb-1.5" style={{ color: "#6E6555" }}>
              truth
            </p>
            <DataGrid values={truth} size={GRID_SIZE} />
          </div>
          <div>
            <p className="font-mono text-[10px] mb-1.5" style={{ color: "#6E6555" }}>
              estimate
            </p>
            <DataGrid values={estimate} truth={truth} size={GRID_SIZE} />
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section>
        <h2 className="font-mono text-xs mb-3" style={{ color: "#A8A092" }}>
          readings
        </h2>
        <div className="flex flex-col gap-4">
          <RadialGauge
            label="accuracy"
            value={metrics.accuracy}
            max={1}
            color="#C9A66B"
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <RadialGauge
            label="monosem."
            value={metrics.monosemanticity}
            max={1}
            color="#9DDBCC"
            format={(v) => v.toFixed(2)}
          />
          <RadialGauge
            label="crosstalk"
            value={metrics.crosstalk}
            max={1}
            color="#A6503B"
            format={(v) => v.toFixed(2)}
            invert
          />
        </div>
      </section>
    </div>
  );
}

function DataGrid({
  values,
  truth,
  size,
}: {
  values: number[];
  truth?: number[];
  size: number;
}) {
  return (
    <div
      className="grid gap-px rounded-[2px] overflow-hidden border"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        width: "80px",
        height: "80px",
        borderColor: "rgba(168, 138, 42, 0.1)",
      }}
    >
      {values.slice(0, size * size).map((v, i) => {
        const differs = truth && Math.abs(v - truth[i]) > 0.25;
        return (
          <div
            key={i}
            className="relative"
            style={{
              backgroundColor:
                v > 0.5
                  ? `rgba(201, 166, 107, ${0.2 + v * 0.6})`
                  : `rgba(20, 17, 13, ${0.5 - v * 0.3})`,
              outline: differs ? "1px solid rgba(166, 80, 59, 0.6)" : "none",
              outlineOffset: "-1px",
            }}
          />
        );
      })}
    </div>
  );
}

function RadialGauge({
  label,
  value,
  max,
  color,
  format,
  invert,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  format: (v: number) => string;
  invert?: boolean;
}) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const displayValue = invert ? value : value;
  const progress = Math.min(1, displayValue / max);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 flex-shrink-0">
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke="rgba(82, 74, 62, 0.2)"
            strokeWidth="2"
          />
          <motion.circle
            cx="28"
            cy="28"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            transform="rotate(-90 28 28)"
            style={{ filter: `drop-shadow(0 0 3px ${color}40)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-mono text-xs tabular-nums"
            style={{ color }}
          >
            {format(value)}
          </span>
        </div>
      </div>
      <span className="font-mono text-sm" style={{ color: "#948A7A" }}>
        {label}
      </span>
    </div>
  );
}
