/**
 * M06: Perception Fusion — Spatial IoU & Geometry Utilities
 * Author: AI005 (Perception Fusion Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, MODULES.md
 */

import { BoundingBox } from './types';
import { PerceptionFusionError } from './errors';

/**
 * Validates bounding box coordinates to ensure non-negative dimensions and valid numbers.
 */
export function validateBoundingBox(bbox: BoundingBox, label = 'BoundingBox'): void {
  if (!bbox || typeof bbox !== 'object') {
    throw new PerceptionFusionError(`${label} must be a valid object`, 'INVALID_BOUNDING_BOX', { bbox });
  }

  const { x, y, width, height } = bbox;

  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    throw new PerceptionFusionError(
      `${label} contains non-finite or non-numeric coordinate values`,
      'INVALID_BOUNDING_BOX',
      { bbox }
    );
  }

  if (width < 0 || height < 0) {
    throw new PerceptionFusionError(
      `${label} width and height must be non-negative`,
      'INVALID_BOUNDING_BOX',
      { bbox }
    );
  }
}

/**
 * Calculates intersection area between two 2D bounding boxes.
 */
export function calculateIntersectionArea(a: BoundingBox, b: BoundingBox): number {
  validateBoundingBox(a, 'BoundingBox A');
  validateBoundingBox(b, 'BoundingBox B');

  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));

  return xOverlap * yOverlap;
}

/**
 * Calculates union area between two 2D bounding boxes.
 */
export function calculateUnionArea(a: BoundingBox, b: BoundingBox): number {
  const areaA = a.width * a.height;
  const areaB = b.width * b.height;
  const intersection = calculateIntersectionArea(a, b);

  return areaA + areaB - intersection;
}

/**
 * Calculates Intersection-over-Union (IoU) between two bounding boxes.
 * Returns value in range [0.0, 1.0].
 */
export function calculateIoU(a: BoundingBox, b: BoundingBox): number {
  const intersection = calculateIntersectionArea(a, b);
  if (intersection <= 0) return 0;

  const union = calculateUnionArea(a, b);
  if (union <= 0) return 0;

  const iou = intersection / union;
  return Math.min(1.0, Math.max(0.0, iou));
}

/**
 * Calculates Euclidean distance between the centers of two bounding boxes.
 */
export function centerDistance(a: BoundingBox, b: BoundingBox): number {
  validateBoundingBox(a, 'BoundingBox A');
  validateBoundingBox(b, 'BoundingBox B');

  const centerAx = a.x + a.width / 2;
  const centerAy = a.y + a.height / 2;
  const centerBx = b.x + b.width / 2;
  const centerBy = b.y + b.height / 2;

  const dx = centerAx - centerBx;
  const dy = centerAy - centerBy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Tests whether `inner` bounding box is substantially contained within `outer` bounding box.
 * Tolerance allows slight boundary overhang (e.g. 2px or 5%).
 */
export function isContained(inner: BoundingBox, outer: BoundingBox, tolerancePx = 4): boolean {
  validateBoundingBox(inner, 'inner');
  validateBoundingBox(outer, 'outer');

  const innerArea = inner.width * inner.height;
  if (innerArea <= 0) return false;

  const intersection = calculateIntersectionArea(inner, outer);
  // If intersection covers at least 85% of inner box, or bounds are within tolerance
  const coverageRatio = intersection / innerArea;
  if (coverageRatio >= 0.85) return true;

  const leftMatch = inner.x >= outer.x - tolerancePx;
  const topMatch = inner.y >= outer.y - tolerancePx;
  const rightMatch = inner.x + inner.width <= outer.x + outer.width + tolerancePx;
  const bottomMatch = inner.y + inner.height <= outer.y + outer.height + tolerancePx;

  return leftMatch && topMatch && rightMatch && bottomMatch;
}

/**
 * Tests whether two bounding boxes overlap at all (intersection > 0).
 */
export function isOverlapping(a: BoundingBox, b: BoundingBox): boolean {
  return calculateIntersectionArea(a, b) > 0;
}
