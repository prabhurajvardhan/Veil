# Concept: Perception Fusion

## Definition
The process of combining local visual understanding output with DOM/A11y structural evidence (and optionally OCR) into one structured perception result.

See `02-system-design/perception/perception-fusion.md` for full design detail; this document exists to give AI coding agents a concise conceptual entry point, per the doc-structure spec.

## Why It Exists
Neither visual grounding nor DOM/A11y evidence alone is assumed sufficient or fully reliable; fusing them with confidence/provenance produces a more trustworthy perception result and supports the "unknown must stay unknown" principle.
