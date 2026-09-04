// TEMP mock engine — swap for real Hebbian computation later, interface stays the same.
// Every UI element reads numbers through this one module only, so it's a one-file swap.

export type AttackType = "distractor" | "capacity" | "orderflip" | "interference";

export type PatchType = "decay" | "gating" | "sparse";

export interface DemoCard {
  id: number;
  label: string;
  input: string;
  output: string;
  grid: number[]; // 4x4 = 16 cells, values 0..1
}

export interface Metrics {
  accuracy: number; // 0..1
  monosemanticity: number; // 0..1
  crosstalk: number; // 0..1
}

export interface SpineNode {
  row: number;
  col: number;
  brightness: number; // 0..1
  attacked: boolean;
  patched: boolean;
  demoId: number | null;
}

export interface SimState {
  capacity: number; // 32, 16, 8
  activeAttack: AttackType | null;
  patches: Record<PatchType, boolean>;
  fedDemos: number[]; // ids of demos that have been fed
  act: number; // 1..5
}

export const GRID_SIZE = 4;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

// Spine matrix dimensions — always 12x12 for legibility, capacity affects brightness not count
export const SPINE_ROWS = 12;
export const SPINE_COLS = 12;

const ATTACK_LABELS: Record<AttackType, string> = {
  distractor: "Feed a lie",
  capacity: "Capacity squeeze",
  orderflip: "Flip the order",
  interference: "Flood with noise",
};

const ACTS = [
  { n: 1, title: "Feed it a rule", attack: null as AttackType | null },
  { n: 2, title: "Break it with a lie", attack: "distractor" as AttackType },
  { n: 3, title: "Starve it", attack: "capacity" as AttackType },
  { n: 4, title: "Scramble the order", attack: "orderflip" as AttackType },
  { n: 5, title: "Drown it in noise", attack: "interference" as AttackType },
];

export function getActs() {
  return ACTS;
}

export function getAttackLabel(a: AttackType): string {
  return ATTACK_LABELS[a];
}

// Simple seeded random for deterministic-but-varied results
function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Generate demo cards — small associative patterns
export function mockDemoCards(): DemoCard[] {
  const patterns: Array<{ label: string; input: string; output: string; grid: number[] }> = [
    {
      label: "A→B",
      input: "0110",
      output: "1001",
      grid: patternToGrid("0110" + "1001"),
    },
    {
      label: "B→C",
      input: "0011",
      output: "1100",
      grid: patternToGrid("0011" + "1100"),
    },
    {
      label: "C→D",
      input: "1010",
      output: "0101",
      grid: patternToGrid("1010" + "0101"),
    },
    {
      label: "D→A",
      input: "1100",
      output: "0011",
      grid: patternToGrid("1100" + "0011"),
    },
  ];
  return patterns.map((p, i) => ({ ...p, id: i }));
}

function patternToGrid(bits: string): number[] {
  const cells: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const idx = i % bits.length;
    cells.push(bits[idx] === "1" ? 0.7 + (i % 3) * 0.1 : 0.08 + (i % 5) * 0.02);
  }
  return cells;
}

// Generate the spine node grid based on current state
export function mockSpineNodes(state: SimState): SpineNode[] {
  const rand = seededRand(state.act * 1000 + state.capacity + state.fedDemos.length * 7);
  const rows = SPINE_ROWS;
  const cols = SPINE_COLS;
  const totalCells = rows * cols;
  const nodes: SpineNode[] = [];

  // Capacity determines what fraction of the matrix is "active"
  const activeFraction = state.capacity >= 32 ? 1.0 : state.capacity >= 16 ? 0.65 : 0.35;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      let brightness: number;
      let attacked = false;
      let patched = false;
      let demoId: number | null = null;

      // Base: visible floor with bright hot spots — readable at a glance
      const isHotSpot = rand() < 0.3;
      brightness = isHotSpot ? 0.65 + rand() * 0.35 : 0.15 + rand() * 0.15;

      // Fed demos brighten specific nodes strongly
      if (state.fedDemos.length > 0) {
        const demoIdx = idx % state.fedDemos.length;
        const demoMod = idx % (Math.floor(totalCells / state.fedDemos.length) || 1);
        if (demoMod < 8) {
          demoId = state.fedDemos[demoIdx];
          brightness = 0.7 + rand() * 0.3;
        }
      }

      // Capacity squeeze: nodes beyond activeFraction are nearly dark
      if (idx >= Math.floor(totalCells * activeFraction)) {
        brightness *= 0.1;
      }

      // Attack effects
      if (state.activeAttack === "distractor") {
        // Clay bleeds into overlap zone between rules
        if (rand() < 0.3 && brightness > 0.3) {
          attacked = true;
          brightness = Math.min(1, brightness + 0.15);
        }
      } else if (state.activeAttack === "orderflip") {
        // Re-sequencing — brightness pattern reverses
        const flippedIdx = totalCells - 1 - idx;
        const flippedR = Math.floor(flippedIdx / cols);
        const flippedC = flippedIdx % cols;
        const flippedHot = (flippedR * 7 + flippedC * 3 + state.act) % 10 < 3;
        brightness = flippedHot ? 0.6 + rand() * 0.35 : 0.03 + rand() * 0.08;
      } else if (state.activeAttack === "interference") {
        // Flicker and dim across the board
        brightness *= 0.3 + rand() * 0.5;
      }

      // Patch effects — only mark patched if a patch is actually on
      if (state.patches.decay) {
        patched = true;
        brightness *= 0.65;
      }
      if (state.patches.gating) {
        patched = true;
        brightness = Math.min(brightness, 0.5);
      }
      if (state.patches.sparse) {
        patched = true;
        // Only top ~5% stay bright, rest go dim
        if (brightness < 0.7) brightness *= 0.15;
      }

      nodes.push({
        row: r,
        col: c,
        brightness: Math.max(0.01, Math.min(1, brightness)),
        attacked,
        patched,
        demoId,
      });
    }
  }
  return nodes;
}

// Compute metrics based on state
export function mockComputeMetrics(state: SimState): Metrics {
  const rand = seededRand(state.act * 500 + state.capacity + state.fedDemos.length * 13);
  const baseAccuracy = state.fedDemos.length > 0 ? 0.88 + rand() * 0.08 : 0.5 + rand() * 0.05;
  const baseMono = state.fedDemos.length > 0 ? 0.82 + rand() * 0.1 : 0.4;
  const baseCross = state.fedDemos.length > 0 ? 0.02 + rand() * 0.03 : 0.01;

  let accuracy = baseAccuracy;
  let monosemanticity = baseMono;
  let crosstalk = baseCross;

  // Capacity squeeze reduces accuracy
  if (state.capacity <= 16) {
    accuracy -= 0.12;
    monosemanticity -= 0.08;
  }
  if (state.capacity <= 8) {
    accuracy -= 0.2;
    monosemanticity -= 0.15;
    crosstalk += 0.15;
  }

  // Attack effects
  if (state.activeAttack === "distractor") {
    accuracy -= 0.25;
    crosstalk += 0.3;
    monosemanticity -= 0.2;
  } else if (state.activeAttack === "capacity") {
    accuracy -= 0.15;
    monosemanticity -= 0.12;
  } else if (state.activeAttack === "orderflip") {
    accuracy -= 0.18;
    monosemanticity -= 0.1;
    crosstalk += 0.08;
  } else if (state.activeAttack === "interference") {
    accuracy -= 0.22;
    monosemanticity -= 0.25;
    crosstalk += 0.12;
  }

  // Patch effects — repairs help but leave their own mark
  if (state.patches.decay) {
    accuracy += 0.06;
    crosstalk -= 0.05;
  }
  if (state.patches.gating) {
    crosstalk -= 0.08;
    monosemanticity += 0.04;
    accuracy += 0.03;
  }
  if (state.patches.sparse) {
    monosemanticity += 0.1;
    accuracy += 0.02;
  }

  // Multiple patches have diminishing returns
  const patchCount = Object.values(state.patches).filter(Boolean).length;
  if (patchCount > 1) {
    accuracy -= (patchCount - 1) * 0.03;
  }

  return {
    accuracy: clamp(accuracy),
    monosemanticity: clamp(monosemanticity),
    crosstalk: clamp(crosstalk),
  };
}

// Generate truth grid — the correct answer
export function mockTruthGrid(state: SimState): number[] {
  const rand = seededRand(state.act * 200 + 42);
  const grid: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    grid.push(rand() > 0.5 ? 0.85 + rand() * 0.15 : 0.05 + rand() * 0.1);
  }
  return grid;
}

// Generate estimate grid — the model's prediction, with errors based on state
export function mockEstimateGrid(state: SimState): number[] {
  const truth = mockTruthGrid(state);
  const metrics = mockComputeMetrics(state);
  const errorRate = 1 - metrics.accuracy;
  const rand = seededRand(state.act * 300 + 99);

  return truth.map((t) => {
    if (rand() < errorRate * 0.4) {
      // Flip
      return t > 0.5 ? 0.05 + rand() * 0.15 : 0.8 + rand() * 0.15;
    }
    if (rand() < errorRate * 0.3) {
      // Partial error
      return t * (0.4 + rand() * 0.4);
    }
    return t + (rand() - 0.5) * 0.05;
  });
}

// Capacity slider tick values
export const CAPACITY_TICKS = [32, 16, 8] as const;

// Patch metadata for citation tooltips
export const PATCH_CITATIONS: Record<PatchType, { eq: string; ref: string }> = {
  decay: {
    eq: "w_ij(t+1) = w_ij(t) · (1 − λ)",
    ref: "Grossberg, S. (1988). Nonlinear neural networks. Neural Networks, 1(4).",
  },
  gating: {
    eq: "y_i = σ(Σ w_ij · x_j) · g_i,  g_i ∈ [0, 1]",
    ref: "Daugherty & Braver (2015). Cognitive Control. Trends in Cognitive Sciences.",
  },
  sparse: {
    eq: "‖w‖₀ ≤ k,  k = 0.05 · N",
    ref: "Olshausen & Field (1996). Emergence of simple-cell receptive field properties. Nature.",
  },
};

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}
