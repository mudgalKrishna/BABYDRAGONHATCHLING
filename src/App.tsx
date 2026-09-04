import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import Arsenal from "@/components/Arsenal";
import Referee from "@/components/Referee";
import ActTimeline from "@/components/ActTimeline";
import Spine from "@/components/Spine";
import {
  type SimState,
  type AttackType,
  type PatchType,
  mockDemoCards,
  mockSpineNodes,
  mockComputeMetrics,
  mockTruthGrid,
  mockEstimateGrid,
  getActs,
} from "@/lib/mockEngine";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function App() {
  const acts = getActs();
  const prefersReducedMotion = usePrefersReducedMotion();
  const isMobile = useIsMobile();

  const [state, setState] = useState<SimState>({
    capacity: 32,
    activeAttack: null,
    patches: { decay: false, gating: false, sparse: false },
    fedDemos: [],
    act: 1,
  });

  const [writePulse, setWritePulse] = useState<{
    active: boolean;
    demoId: number | null;
  }>({ active: false, demoId: null });

  const [arsenalOpen, setArsenalOpen] = useState(false);

  const demos = useMemo(() => mockDemoCards(), []);

  const nodes = useMemo(() => mockSpineNodes(state), [state]);
  const metrics = useMemo(() => mockComputeMetrics(state), [state]);
  const truth = useMemo(() => mockTruthGrid(state), [state]);
  const estimate = useMemo(() => mockEstimateGrid(state), [state]);

  const currentActData = acts.find((a) => a.n === state.act) ?? acts[0];

  const handleFeedDemo = useCallback((id: number) => {
    setState((s) => ({
      ...s,
      fedDemos: s.fedDemos.includes(id) ? s.fedDemos : [...s.fedDemos, id],
    }));
    // Trigger write pulse
    setWritePulse({ active: true, demoId: id });
    setTimeout(() => setWritePulse({ active: false, demoId: null }), 1200);
  }, []);

  const handleAttack = useCallback((attack: AttackType) => {
    setState((s) => ({
      ...s,
      activeAttack: s.activeAttack === attack ? null : attack,
    }));
  }, []);

  const handleCapacityChange = useCallback((value: number) => {
    setState((s) => ({ ...s, capacity: value }));
  }, []);

  const handleTogglePatch = useCallback((patch: PatchType) => {
    setState((s) => ({
      ...s,
      patches: { ...s.patches, [patch]: !s.patches[patch] },
    }));
  }, []);

  const handleActClick = useCallback((act: number) => {
    setState((s) => ({
      ...s,
      act,
      activeAttack: acts.find((a) => a.n === act)?.attack ?? null,
    }));
  }, [acts]);

  return (
    <div
      className="h-screen flex flex-col noise-bg overflow-hidden"
      style={{ backgroundColor: "#0A0907" }}
    >
      <Header
        act={state.act}
        actTitle={currentActData.title}
        totalActs={acts.length}
      />

      {/* Desktop layout */}
      {!isMobile && (
        <div className="flex-1 flex min-h-0 relative">
          {/* Grid overlay on the center area */}
          <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />

          {/* Left rail — Arsenal */}
          <div
            className="w-[22%] min-w-[200px] max-w-[280px] border-r relative z-10"
            style={{
              backgroundColor: "rgba(29, 26, 21, 0.4)",
              borderColor: "rgba(201, 166, 107, 0.12)",
            }}
          >
            <Arsenal
              demos={demos}
              state={state}
              onFeedDemo={handleFeedDemo}
              onAttack={handleAttack}
              onCapacityChange={handleCapacityChange}
              onTogglePatch={handleTogglePatch}
            />
          </div>

          {/* Center — Spine */}
          <div className="flex-1 relative min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={state.act}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="absolute inset-0"
              >
                <Spine
                  nodes={nodes}
                  state={state}
                  writePulse={writePulse}
                  prefersReducedMotion={prefersReducedMotion}
                />
              </motion.div>
            </AnimatePresence>

            {/* Act title overlay */}
            <div className="absolute top-4 left-6 z-10 pointer-events-none">
              <motion.p
                key={state.act}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
                className="font-serif text-xl"
                style={{ color: "#E8E1D3", fontStyle: "italic" }}
              >
                {currentActData.title}
              </motion.p>
            </div>


          </div>

          {/* Right rail — Referee */}
          <div
            className="w-[22%] min-w-[200px] max-w-[280px] border-l relative z-10"
            style={{
              backgroundColor: "rgba(29, 26, 21, 0.4)",
              borderColor: "rgba(201, 166, 107, 0.12)",
            }}
          >
            <Referee truth={truth} estimate={estimate} metrics={metrics} />
          </div>
        </div>
      )}

      {/* Mobile layout — stacked */}
      {isMobile && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Spine first */}
          <div className="relative h-[45vh] flex-shrink-0">
            <Spine
              nodes={nodes}
              state={state}
              writePulse={writePulse}
              prefersReducedMotion={prefersReducedMotion}
            />
            <div className="absolute top-3 left-4 z-10 pointer-events-none">
              <p className="font-serif text-base" style={{ color: "#E8E1D3", fontStyle: "italic" }}>
                {currentActData.title}
              </p>
            </div>
          </div>

          {/* Referee metrics */}
          <div
            className="border-t border-brass-500/12"
            style={{ backgroundColor: "rgba(29, 26, 21, 0.4)" }}
          >
            <Referee truth={truth} estimate={estimate} metrics={metrics} />
          </div>

          {/* Arsenal as accordion */}
          <div className="border-t border-brass-500/12">
            <button
              onClick={() => setArsenalOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <span className="font-mono text-sm" style={{ color: "#C9A66B" }}>
                arsenal
              </span>
              <motion.span
                animate={{ rotate: arsenalOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="font-mono text-xs"
                style={{ color: "#948A7A" }}
              >
                ▾
              </motion.span>
            </button>
            <AnimatePresence>
              {arsenalOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="overflow-hidden"
                >
                  <Arsenal
                    demos={demos}
                    state={state}
                    onFeedDemo={handleFeedDemo}
                    onAttack={handleAttack}
                    onCapacityChange={handleCapacityChange}
                    onTogglePatch={handleTogglePatch}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <ActTimeline currentAct={state.act} onActClick={handleActClick} />
    </div>
  );
}

export default App;
