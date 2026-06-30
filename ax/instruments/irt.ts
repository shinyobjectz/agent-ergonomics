/**
 * Instrument 5 — Item Response Theory (Rasch / 1PL).
 * Given a subjects×probes pass/fail matrix, jointly estimate each subject's
 * latent AX ability (θ) and each probe's difficulty (β) via JMLE. Separates
 * "hard probe" from "low-AX tool". Pure computation.
 */
export interface IrtResult {
  ability: Record<string, number>; // θ per subject (latent AX)
  difficulty: Record<string, number>; // β per probe
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

/**
 * R[i][j] in {0,1} (subject i on probe j). Joint MLE by alternating Newton steps.
 * Perfect/zero rows & columns get a small extremity correction to stay finite.
 */
export function rasch(subjects: string[], probes: string[], R: number[][], iters = 60): IrtResult {
  const I = subjects.length, J = probes.length;
  const theta = new Array(I).fill(0);
  const beta = new Array(J).fill(0);
  // raw scores
  const rowScore = R.map((r) => r.reduce((a, b) => a + b, 0));
  const colScore = probes.map((_, j) => R.reduce((a, r) => a + r[j], 0));

  for (let it = 0; it < iters; it++) {
    // update theta (fix beta)
    for (let i = 0; i < I; i++) {
      if (rowScore[i] === 0) { theta[i] = -3; continue; }
      if (rowScore[i] === J) { theta[i] = 3; continue; }
      let num = 0, den = 0;
      for (let j = 0; j < J; j++) {
        const p = sigmoid(theta[i] - beta[j]);
        num += R[i][j] - p;
        den += p * (1 - p);
      }
      theta[i] += den > 1e-6 ? num / den : 0;
      theta[i] = Math.max(-4, Math.min(4, theta[i]));
    }
    // update beta (fix theta)
    for (let j = 0; j < J; j++) {
      if (colScore[j] === 0) { beta[j] = 3; continue; } // nobody passed → hard
      if (colScore[j] === I) { beta[j] = -3; continue; } // everybody passed → easy
      let num = 0, den = 0;
      for (let i = 0; i < I; i++) {
        const p = sigmoid(theta[i] - beta[j]);
        num += p - R[i][j];
        den += p * (1 - p);
      }
      beta[j] += den > 1e-6 ? num / den : 0;
      beta[j] = Math.max(-4, Math.min(4, beta[j]));
    }
    // center difficulties (identifiability)
    const bMean = beta.reduce((a, b) => a + b, 0) / J;
    for (let j = 0; j < J; j++) beta[j] -= bMean;
    for (let i = 0; i < I; i++) theta[i] -= bMean;
  }

  const ability: Record<string, number> = {};
  subjects.forEach((s, i) => (ability[s] = +theta[i].toFixed(3)));
  const difficulty: Record<string, number> = {};
  probes.forEach((p, j) => (difficulty[p] = +beta[j].toFixed(3)));
  return { ability, difficulty };
}
