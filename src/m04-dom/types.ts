export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DomElementEvidence {
  target_id: string;
  bbox: BoundingBox;
  role: string;
  text?: string;
  interactable: boolean;
}

export interface DomEvidence {
  source: 'CDP';
  elements: DomElementEvidence[];
}

export class DomGroundingError extends Error {
  constructor(message: string, public readonly details?: unknown) {
    super(`[M04:DomGrounding] ${message}`);
    this.name = 'DomGroundingError';
  }
}
