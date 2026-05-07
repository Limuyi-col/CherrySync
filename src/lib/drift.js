import { collectEffectiveStateForEnvironment } from "./state-model.js";

export function detectDrift(state, envA, envB) {
  const effectiveA = collectEffectiveStateForEnvironment(state, envA);
  const effectiveB = collectEffectiveStateForEnvironment(state, envB);

  const allFiles = new Set([
    ...Object.keys(effectiveA),
    ...Object.keys(effectiveB),
  ]);
  const results = [];

  for (const filePath of [...allFiles].sort()) {
    const digestsA = effectiveA[filePath];
    const digestsB = effectiveB[filePath];
    const hasA = digestsA && digestsA.length > 0;
    const hasB = digestsB && digestsB.length > 0;

    if (!hasA && hasB) {
      results.push({
        path: filePath,
        type: "missing_in_a",
        description: `Present in ${envB}, missing in ${envA}`,
      });
    } else if (hasA && !hasB) {
      results.push({
        path: filePath,
        type: "missing_in_b",
        description: `Present in ${envA}, missing in ${envB}`,
      });
    } else if (hasA && hasB) {
      const uniqueA = new Set(digestsA);
      const uniqueB = new Set(digestsB);
      const allSame =
        uniqueA.size === 1 &&
        uniqueB.size === 1 &&
        [...uniqueA][0] === [...uniqueB][0];

      if (!allSame) {
        results.push({
          path: filePath,
          type: "diverged",
          description: `Different content between environments`,
          details: {
            [`${envA}`]:
              uniqueA.size === 1 ? "consistent" : "inconsistent across servers",
            [`${envB}`]:
              uniqueB.size === 1 ? "consistent" : "inconsistent across servers",
          },
        });
      }
    }
  }

  return results;
}
