# Frontend Plan

## Pages

- `/`: optional product overview
- `/dashboard`: total consumers, active anomalies, high-risk cases, transformer unexplained loss, active investigations, live events
- `/grid`: substation, feeder, transformer, consumer hierarchy
- `/consumers`: filterable consumer explorer
- `/consumers/[id]`: consumption history, personal baseline, peer comparison, risk, probable cause, evidence, transformer context
- `/investigations`: case queue sorted by inspection priority
- `/investigations/[id]`: full investigation workspace
- `/simulation`: Digital Twin controls
- `/stress-test`: evaluation environment

## Investigation Page UX

```text
ELECTRON - INVESTIGATION C031

Risk: HIGH
Probable Cause: THEFT/TAMPERING
Inspection Priority: 94

WHY WAS THIS FLAGGED?
Personal deviation
Peer deviation
Persistence
Communication health
Meter health
Transformer correlation

Consumption Graph
Actual vs Personal Baseline vs Peer Median

GRID CONTEXT
Feeder F01
Transformer T02
Transformer unexplained loss
Other suspicious consumers

FIELD INVESTIGATION
Checklist

TALK TO ELECTRON
Start Voice Investigation
Language: Auto / English / Hindi / Odia

CASE TIMELINE
```

## Component Areas

- dashboard metrics and event stream
- grid topology visualization
- consumer profile panels
- investigation evidence cards
- checklist and field observations
- simulation controls
- voice session controls
