import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DemoCard, SimState, AttackType, PatchType } from "@/lib/mockEngine";
import { getActs, getAttackLabel, CAPACITY_TICKS, PATCH_CITATIONS } from "@/lib/mockEngine";

interface ArsenalProps {
  demos: DemoCard[];
  state: SimState;
  onFeedDemo: (id: number) => void;
  onAttack: (attack: AttackType) => void;
  onCapacityChange: (value: number) => void;
  onTogglePatch: (patch: PatchType) => void;
}

const ATTACKS: AttackType[] = ["distractor", "capacity", "orderflip", "interference"];

const PATCH_LABELS: Record<PatchType, string> = {
  decay: "decay",
  gating: "gating",
  sparse: "sparse",
};

export default function Arsenal({
  demos,
  state,
  onFeedDemo,
  onAttack,
  onCapacityChange,
  onTogglePatch,
}: ArsenalProps) {
  const acts = getActs();
  const [hoveredPatch, setHoveredPatch] = useState<PatchType | null>(null);

  return (
    <div className="flex flex-col gap-6 px-4 py-5 overflow-y-auto h-full">
      {/* Demo cards */}
      <section>
        <h2 className="font-mono text-xs mb-3" style={{ color: "#A8A092" }}>
          demonstrations
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {demos.map((demo) => {
            const fed = state.fedDemos.includes(demo.id);
            return (
              <button
                key={demo.id}
                onClick={() => onFeedDemo(demo.id)}
                className={`group relative brass-border rounded-[2px] p-2 transition-all duration-300 ${
                  fed ? "bg-brass-500/10" : "bg-ink-800/50 hover:bg-ink-700/50"
                }`}
                style={{
                  borderColor: fed ? "rgba(201, 166, 107, 0.4)" : "rgba(168, 138, 42, 0.12)",
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="font-mono text-[10px]"
                    style={{ color: fed ? "#C9A66B" : "#948A7A" }}
                  >
                    {demo.label}
                  </span>
                  {fed && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "#C9A66B" }}
                    />
                  )}
                </div>
                <MiniGrid values={demo.grid} size={4} />
              </button>
            );
          })}
        </div>
      </section>

      {/* Attacks */}
      <section>
        <h2 className="font-mono text-xs mb-3" style={{ color: "#A8A092" }}>
          attacks
        </h2>
        <div className="flex flex-col gap-2">
          {ATTACKS.map((attack) => {
            const actForAttack = acts.find((a) => a.attack === attack);
            const isCurrentAct = actForAttack?.n === state.act;
            const isActive = state.activeAttack === attack;
            return (
              <button
                key={attack}
                onClick={() => onAttack(attack)}
                className={`font-mono text-sm text-left px-3 py-2 rounded-[2px] border transition-all duration-300 ${
                  isActive
                    ? "border-clay/40 bg-clay/10"
                    : isCurrentAct
                      ? "border-brass-300/30 bg-brass-500/5 hover:bg-brass-500/10"
                      : "border-ink-500/30 bg-ink-800/30 opacity-40 hover:opacity-60"
                }`}
                style={{
                  borderColor: isActive
                    ? "rgba(166, 80, 59, 0.5)"
                    : isCurrentAct
                      ? "rgba(201, 166, 107, 0.3)"
                      : "rgba(58, 51, 41, 0.4)",
                  color: isActive ? "#A6503B" : isCurrentAct ? "#C9A66B" : "#948A7A",
                }}
              >
                {getAttackLabel(attack)}
              </button>
            );
          })}
        </div>
      </section>

      {/* Capacity slider */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-mono text-xs" style={{ color: "#A8A092" }}>
            capacity
          </h2>
          <span
            className="font-mono text-sm tabular-nums"
            style={{ color: "#C9A66B" }}
          >
            {state.capacity}
          </span>
        </div>
        <div className="relative px-1">
          <input
            type="range"
            min={8}
            max={32}
            step={8}
            value={state.capacity}
            onChange={(e) => onCapacityChange(Number(e.target.value))}
            className="w-full"
            list="capacity-ticks"
          />
          <div className="flex justify-between mt-1.5 font-mono text-[10px]" style={{ color: "#6E6555" }}>
            {CAPACITY_TICKS.slice()
              .sort((a, b) => a - b)
              .map((tick) => (
                <span key={tick} className={state.capacity === tick ? "text-brass-300" : ""} style={{ color: state.capacity === tick ? "#C9A66B" : "#6E6555" }}>
                  {tick}
                </span>
              ))}
          </div>
        </div>
      </section>

      {/* Patches */}
      <section>
        <h2 className="font-mono text-xs mb-3" style={{ color: "#A8A092" }}>
          patches
        </h2>
        <div className="flex flex-col gap-2.5">
          {(Object.keys(PATCH_LABELS) as PatchType[]).map((patch) => {
            const on = state.patches[patch];
            return (
              <div
                key={patch}
                className="relative"
                onMouseEnter={() => setHoveredPatch(patch)}
                onMouseLeave={() => setHoveredPatch(null)}
              >
                <button
                  onClick={() => onTogglePatch(patch)}
                  className="flex items-center gap-3 w-full"
                >
                  <span
                    className="font-mono text-sm flex-1 text-left"
                    style={{ color: on ? "#4C7A70" : "#948A7A" }}
                  >
                    {PATCH_LABELS[patch]}
                  </span>
                  {/* Physical switch */}
                  <span
                    className="relative w-9 h-5 rounded-[2px] border transition-colors duration-300"
                    style={{
                      backgroundColor: on ? "rgba(76, 122, 112, 0.2)" : "rgba(42, 36, 29, 0.6)",
                      borderColor: on ? "rgba(76, 122, 112, 0.5)" : "rgba(82, 74, 62, 0.4)",
                    }}
                  >
                    <motion.span
                      className="absolute top-0.5 w-3.5 h-3.5 rounded-[1px]"
                      animate={{ left: on ? "18px" : "2px" }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        backgroundColor: on ? "#4C7A70" : "#524A3E",
                        boxShadow: on ? "0 0 6px rgba(76, 122, 112, 0.4)" : "none",
                      }}
                    />
                  </span>
                </button>

                {/* Citation tooltip */}
                <AnimatePresence>
                  {hoveredPatch === patch && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2 }}
                      className="absolute z-30 left-0 top-full mt-2 w-64 p-3 rounded-[2px] border"
                      style={{
                        backgroundColor: "#14110D",
                        borderColor: "rgba(76, 122, 112, 0.25)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      }}
                    >
                      <p className="font-mono text-[11px] mb-2" style={{ color: "#4C7A70" }}>
                        {PATCH_CITATIONS[patch].eq}
                      </p>
                      <p className="font-mono text-[10px] leading-relaxed" style={{ color: "#6E6555" }}>
                        {PATCH_CITATIONS[patch].ref}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MiniGrid({ values, size }: { values: number[]; size: number }) {
  return (
    <div
      className="grid gap-px"
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
      }}
    >
      {values.slice(0, size * size).map((v, i) => (
        <div
          key={i}
          className="aspect-square rounded-[1px]"
          style={{
            backgroundColor:
              v > 0.5
                ? `rgba(201, 166, 107, ${0.3 + v * 0.5})`
                : `rgba(168, 138, 42, ${0.05 + v * 0.15})`,
          }}
        />
      ))}
    </div>
  );
}
