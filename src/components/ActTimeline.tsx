import { motion } from "framer-motion";
import { getActs } from "@/lib/mockEngine";

interface ActTimelineProps {
  currentAct: number;
  onActClick: (act: number) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function ActTimeline({ currentAct, onActClick }: ActTimelineProps) {
  const acts = getActs();
  const current = acts.find((a) => a.n === currentAct) ?? acts[0];

  return (
    <div
      className="flex items-center px-6 py-3 border-t relative z-20"
      style={{
        borderColor: "rgba(201, 166, 107, 0.12)",
        backgroundColor: "rgba(10, 9, 7, 0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      {/* Five dots connected by a thin line */}
      <div className="flex items-center gap-0">
        {acts.map((act, i) => {
          const isCurrent = act.n === currentAct;
          const isPast = act.n < currentAct;
          return (
            <div key={act.n} className="flex items-center">
              <button
                onClick={() => onActClick(act.n)}
                className="flex items-center justify-center p-1"
                aria-label={`act ${act.n}`}
              >
                <motion.span
                  className="block rounded-full"
                  animate={{
                    width: isCurrent ? 10 : 7,
                    height: isCurrent ? 10 : 7,
                    backgroundColor: isCurrent
                      ? "#C9A66B"
                      : isPast
                        ? "#8A6F1E"
                        : "#3A3329",
                  }}
                  transition={{ duration: 0.4, ease: EASE }}
                  style={{
                    boxShadow: isCurrent ? "0 0 8px rgba(201, 166, 107, 0.5)" : "none",
                  }}
                />
              </button>
              {i < acts.length - 1 && (
                <div
                  className="h-px w-6"
                  style={{
                    background: isPast
                      ? "rgba(138, 111, 30, 0.4)"
                      : "rgba(58, 51, 41, 0.4)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current act label only */}
      <motion.div
        key={currentAct}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="font-mono text-xs ml-4 whitespace-nowrap"
        style={{ color: "#948A7A" }}
      >
        <span style={{ color: "#C9A66B" }}>●</span> act {current.n} of {acts.length} —{" "}
        <span style={{ color: "#C9A66B" }}>{current.title}</span>
      </motion.div>
    </div>
  );
}
