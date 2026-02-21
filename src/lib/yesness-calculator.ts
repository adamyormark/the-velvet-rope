import type { FaceExpression, ExpressionSnapshot } from './types';

const EXPRESSION_WEIGHTS: Record<FaceExpression, number> = {
  happy: +1.0,
  surprised: +0.6,
  neutral: +0.1,
  sad: -0.3,
  fearful: -0.2,
  angry: -0.7,
  disgusted: -1.0,
};

export function calculateYesnessSignal(
  expressions: Record<FaceExpression, number>
): number {
  let signal = 0;
  for (const [expr, prob] of Object.entries(expressions)) {
    signal += (EXPRESSION_WEIGHTS[expr as FaceExpression] || 0) * prob;
  }
  return Math.max(-1, Math.min(1, signal));
}

export function calculateFinalScore(snapshots: ExpressionSnapshot[]): number {
  if (snapshots.length === 0) return 50;
  const avg =
    snapshots.reduce((sum, s) => sum + s.yesnessSignal, 0) / snapshots.length;
  // Map [-1, 1] to [0, 100]
  return Math.round(((avg + 1) / 2) * 100);
}

export function getDominantExpression(
  expressions: Record<FaceExpression, number>
): FaceExpression {
  let max = -1;
  let dominant: FaceExpression = 'neutral';
  for (const [expr, prob] of Object.entries(expressions)) {
    if (prob > max) {
      max = prob;
      dominant = expr as FaceExpression;
    }
  }
  return dominant;
}
