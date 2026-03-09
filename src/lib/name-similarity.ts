/**
 * Dice coefficient on character bigrams – measures name similarity (0–1).
 * A score ≥ 0.45 is treated as "similar enough" to flag for review.
 */

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const bi = s.substring(i, i + 2);
    map.set(bi, (map.get(bi) || 0) + 1);
  }
  return map;
}

export function diceSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const biA = bigrams(na);
  const biB = bigrams(nb);

  let intersection = 0;
  biA.forEach((count, bi) => {
    const other = biB.get(bi) || 0;
    intersection += Math.min(count, other);
  });

  let sizeA = 0;
  biA.forEach((c) => (sizeA += c));
  let sizeB = 0;
  biB.forEach((c) => (sizeB += c));

  return (2 * intersection) / (sizeA + sizeB);
}

/** Also check if one name fully contains the other (common with middle names) */
function nameContains(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  const partsA = na.split(" ");
  const partsB = nb.split(" ");
  // Check if all parts of the shorter name appear in the longer
  const [shorter, longer] = partsA.length <= partsB.length ? [partsA, partsB] : [partsB, partsA];
  if (shorter.length < 2) return false;
  return shorter.every((p) => longer.includes(p));
}

export interface SimilarMatch {
  csvName: string;
  existingName: string;
  score: number;
  csvRowIndex: number;
}

const SIMILARITY_THRESHOLD = 0.45;

/**
 * Given a list of CSV names and existing DB names,
 * returns potential duplicates that need user resolution.
 */
export function findDuplicates(
  csvNames: { name: string; rowIndex: number }[],
  existingNames: string[],
): SimilarMatch[] {
  const matches: SimilarMatch[] = [];
  const existingNorm = existingNames.map((n) => ({ original: n, norm: normalize(n) }));

  for (const csv of csvNames) {
    const csvNorm = normalize(csv.name);
    // Skip exact matches – those are handled as updates, not duplicates
    if (existingNorm.some((e) => e.norm === csvNorm)) continue;

    let bestScore = 0;
    let bestMatch = "";

    for (const ex of existingNorm) {
      // Check containment first (stronger signal)
      if (nameContains(csv.name, ex.original)) {
        if (0.85 > bestScore) {
          bestScore = 0.85;
          bestMatch = ex.original;
        }
        continue;
      }
      const score = diceSimilarity(csv.name, ex.original);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = ex.original;
      }
    }

    if (bestScore >= SIMILARITY_THRESHOLD && bestMatch) {
      matches.push({
        csvName: csv.name,
        existingName: bestMatch,
        score: bestScore,
        csvRowIndex: csv.rowIndex,
      });
    }
  }

  return matches;
}
