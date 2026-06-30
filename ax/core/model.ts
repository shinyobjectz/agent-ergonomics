/**
 * Canonical AX model — surfaces (rows) × lenses (columns).
 * The single source of truth consumed by probes, instruments, profile, report.
 * See docs/ax-model.md.
 */

export const SURFACES = [
  "disclosure", // how the agent is informed/taught
  "interface", // calling it correctly (incl. control mode)
  "loop", // operate turn-to-turn
  "recursion", // the continual cross-turn experience
  "human", // the collaboration/oversight relationship
] as const;
export type Surface = (typeof SURFACES)[number];

export const LENSES = [
  "coherence", // DRY <-> WET; aligned, non-redundant state/task/memory/code
  "economy", // token/context cost
  "determinism", // predictable + reproducible
  "verifiability", // empirically checkable (read AND query/test)
  "prior_alignment", // matches the agent's training expectations
  "safety", // reversible / low blast-radius
] as const;
export type Lens = (typeof LENSES)[number];

export type CellId = `${Surface}.${Lens}`;

export const cellId = (s: Surface, l: Lens): CellId => `${s}.${l}`;

export const ALL_CELLS: CellId[] = SURFACES.flatMap((s) =>
  LENSES.map((l) => cellId(s, l)),
);

/** Named qualitative levels (used only when an instrument can't give a number). */
export const LEVELS = ["hostile", "absent", "tolerable", "good", "exemplary"] as const;
export type Level = (typeof LEVELS)[number];
/** Normalized numeric anchor per level, in [-1, 1] (hostile is negative on purpose). */
export const LEVEL_VALUE: Record<Level, number> = {
  hostile: -1,
  absent: 0,
  tolerable: 0.33,
  good: 0.66,
  exemplary: 1,
};

export const INSTRUMENTS = [
  "telemetry",
  "counters",
  "perplexity",
  "elo",
  "irt",
  "trajectory",
  "pareto",
  "friction",
] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

/**
 * Default instrument -> cell mapping (which instruments primarily fill which
 * cells). A cell may be filled by several; this is the planning default,
 * refined by Phase-4 instrument validation. Empty = not yet wired.
 */
export const INSTRUMENT_CELLS: Partial<Record<Instrument, CellId[]>> = {
  counters: [
    "disclosure.economy",
    "interface.economy",
    "interface.coherence",
    "loop.economy",
    "loop.determinism",
    "loop.safety",
    "recursion.coherence",
    "human.coherence",
    "human.safety",
  ],
  perplexity: ["interface.prior_alignment", "disclosure.prior_alignment", "interface.coherence"],
  telemetry: [
    "loop.verifiability",
    "loop.determinism",
    "disclosure.economy",
    "loop.economy",
    "interface.verifiability",
  ],
  trajectory: ["recursion.economy", "recursion.determinism", "recursion.coherence"],
  friction: ["loop.safety", "human.safety", "disclosure.coherence", "recursion.safety"],
  elo: [], // holistic; cross-tool, not single-cell
  irt: [], // latent composite
  pareto: [], // combining, not a cell
};

export const SURFACE_LABEL: Record<Surface, string> = {
  disclosure: "Disclosure",
  interface: "Interface",
  loop: "Loop",
  recursion: "Recursion",
  human: "Human",
};
export const LENS_LABEL: Record<Lens, string> = {
  coherence: "Coherence (DRY↔WET)",
  economy: "Economy",
  determinism: "Determinism",
  verifiability: "Verifiability",
  prior_alignment: "Prior-alignment",
  safety: "Safety",
};
