# Multi-Building Outlier Guardrails

## Problem Statement

Electron currently works with aggregate row-level readings. In some datasets, one row can represent a consumer account, a meter group, a feeder segment, or a mixed building load instead of one clearly attributable building. A high ML risk score is still useful for ranking field work, but it must not be presented as proof that one specific building is responsible.

The guardrail layer protects that distinction:

ML prediction -> context/outlier guardrail -> adjusted investigation priority -> investigation case

## Why Attribution Is Uncertain

When building metadata, sub-meter splits, or reliable allocation ratios are missing, Electron cannot know whether an abnormal reading belongs to one building or several. Large mixed-use loads can also look anomalous because residential, commercial, seasonal, and equipment-driven patterns are blended together.

This creates false-positive risk if the product says "theft detected in this building." The safer claim is that Electron found a high-risk aggregate anomaly that needs field verification.

## Implemented API Fields

Anomaly and investigation case responses now include:

```text
case_type: STANDARD | AGGREGATE_REVIEW
raw_risk_score
adjusted_risk_score
outlier_flags
allocation_confidence
attribution_status
recommendation
risk_adjustment_reason
```

The raw ML score is preserved as `raw_risk_score` and the existing `risk_score`. Guardrails never overwrite the model score. `adjusted_risk_score` is only an investigation-priority score.

Current defaults when metadata is missing:

```text
allocation_confidence = UNKNOWN
attribution_status = AGGREGATE_ONLY
case_type = AGGREGATE_REVIEW for HIGH or CRITICAL rows
```

## Backend Guardrail Rules

Implemented now:

- High or critical rows with unknown/non-direct attribution become `AGGREGATE_REVIEW`.
- Raw risk is preserved.
- Investigation priority is adjusted downward for aggregate attribution, weak corroboration, communication-heavy evidence, meter-fault-like evidence, and large aggregate outliers.
- Communication-heavy cases recommend communication review before theft/tampering escalation.
- Meter-fault-like cases recommend meter-fault review before theft/tampering escalation.
- Case recommendations avoid direct building-level blame when attribution is aggregate-only.

The current implementation infers context from evidence fields such as:

```text
allocation_confidence
attribution_status
communication_health_score
meter_health_score
recent_vs_hist_drop_pct
outlier_flags
```

Future ML exports can provide these fields directly; until then, missing attribution metadata is treated conservatively.

## ML Evaluation Slices

Keep the current XGBoost inspection-ranking model unchanged for now. Future evaluation should report `Precision@100` and inspection queue precision across these slices:

```text
single-building rows
aggregate/unknown rows
large-load outliers
high-variance consumers
communication-heavy consumers
meter-fault-like consumers
```

Do not optimize only for recall if false positives rise too much. In field operations, an over-broad queue wastes inspection capacity and reduces trust.

## Frontend Wording

For aggregate cases, use:

```text
High-risk aggregate anomaly
```

Do not use:

```text
Theft detected in this building
```

The UI should show:

- Raw ML Risk
- Adjusted Investigation Priority
- Attribution Confidence
- Outlier Flags
- Why Adjusted?
- Field Verification Needed

Current warning copy:

```text
This reading may represent multiple buildings. Electron cannot attribute the anomaly to one building without field verification.
```

## Investigation Checklist Additions

Field teams should explicitly verify:

- Whether the reading is single-building or aggregate.
- Whether communication loss, gaps, or delayed packets explain the anomaly.
- Whether meter fault or meter diagnostic issues explain the anomaly.
- Whether connected load and meter reading match the site.
- Whether physical evidence supports escalation beyond review.

## Demo Explanation For Judges

Use this wording:

```text
The ML model still ranks this as high risk, so we preserve the raw score. Because the input row may represent multiple buildings, Electron creates an aggregate review case instead of blaming one building. The adjusted priority tells the field team how urgently to verify the site, while the raw ML score remains available for audit and model evaluation.
```

## Future Metadata Path

If reliable metadata becomes available, Electron can move from aggregate review to more precise attribution:

- Building count per row.
- Meter-to-building mapping.
- Sub-meter consumption splits.
- Sanctioned load and occupancy metadata.
- Transformer or feeder energy balance at matching intervals.
- Field-confirmed outcomes fed back into evaluation.

With that data, `allocation_confidence` can move from `UNKNOWN` to `MEDIUM` or `HIGH`, and `attribution_status` can become `SINGLE_BUILDING` or `DIRECT_METER` when justified.
