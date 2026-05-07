import type { Scale, ScaleScore } from './types';

/**
 * Calculate score for a single scale
 */
export function scoreScale(
  scale: Scale,
  responses: Record<string, number>
): ScaleScore {
  let sum = 0;
  let itemCount = 0;

  for (const item of scale.items) {
    // Check if any of the item IDs has a response
    const response = item.itemIds.map(id => responses[id]).find(r => r !== undefined && r !== null);

    // Skip if no response for any of this item's IDs
    if (response === undefined || response === null) {
      continue;
    }

    // Apply keying:
    // +keyed items: use response as-is (1-5)
    // -keyed items: reverse score (6 - response)
    const score = item.keying === 1 ? response : (6 - response);
    sum += score;
    itemCount++;
  }

  const rawScore = sum;
  const meanScore = itemCount > 0 ? sum / itemCount : 0;

  return {
    scaleId: scale.id,
    scaleName: scale.name,
    rawScore,
    meanScore,
    // Percentile would require norm data, which we don't have yet
    percentile: undefined
  };
}

/**
 * Calculate scores for multiple scales
 */
export function scoreScales(
  scales: Scale[],
  responses: Record<string, number>
): ScaleScore[] {
  return scales.map(scale => scoreScale(scale, responses));
}

/**
 * Check if all items in a scale have been answered
 */
export function isScaleComplete(
  scale: Scale,
  responses: Record<string, number>
): boolean {
  return scale.items.every(item => {
    // Check if any of the item IDs has a response
    return item.itemIds.some(id => {
      const response = responses[id];
      return response !== undefined && response !== null;
    });
  });
}

/**
 * Calculate completion percentage for a test
 */
export function calculateCompletion(
  itemIds: string[],
  responses: Record<string, number>
): number {
  const answeredCount = itemIds.filter(id => {
    const response = responses[id];
    return response !== undefined && response !== null;
  }).length;

  return itemIds.length > 0 ? (answeredCount / itemIds.length) * 100 : 0;
}

/**
 * Validate response value (must be 1-5)
 */
export function isValidResponse(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

/**
 * Get missing items (items without responses)
 */
export function getMissingItems(
  itemIds: string[],
  responses: Record<string, number>
): string[] {
  return itemIds.filter(id => {
    const response = responses[id];
    return response === undefined || response === null;
  });
}

/**
 * Export results as JSON
 */
export function exportResultsAsJSON(
  testName: string,
  scaleScores: ScaleScore[],
  responses: Record<string, number>
): string {
  const results = {
    testName,
    completedAt: new Date().toISOString(),
    scaleScores,
    responses
  };

  return JSON.stringify(results, null, 2);
}

/**
 * Export results as CSV
 */
export function exportResultsAsCSV(
  scaleScores: ScaleScore[]
): string {
  const headers = ['Scale', 'Raw Score', 'Mean Score'];
  const rows = scaleScores.map(score => [
    score.scaleName,
    score.rawScore.toString(),
    score.meanScore.toFixed(2)
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
}
