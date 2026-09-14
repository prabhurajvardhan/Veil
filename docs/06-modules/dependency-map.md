# Module Dependency Map

## Linear Pipeline Dependency (PROPOSED)

```
VEIL-OBS → VEIL-PERCEPTION → VEIL-FUSION → VEIL-PRIVACY → VEIL-REASONING → VEIL-VALIDATION → VEIL-EXECUTION → (loops back to VEIL-OBS)
```

VEIL-STATE depends on and orchestrates all of the above; all modules depend on VEIL-STATE for their triggering/transitions.

## Notes
This is a straight-line dependency graph reflecting the core loop; it has not been validated against actual module boundaries or code structure, since none exists yet.
