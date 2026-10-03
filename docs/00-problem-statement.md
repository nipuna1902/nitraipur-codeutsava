# Problem Statement

Electricity distribution networks can show abnormal readings for many reasons: technical losses, theft or tampering, faulty meters, communication failures, abnormal consumption, and legitimate seasonal or behavioral changes.

Electron must avoid treating every unusual reading as theft. The platform should separate:

- abnormal behavior
- probable cause
- strength of evidence
- grid-level loss correlation
- inspection priority
- final field-confirmed outcome

The central operating question is:

> What is abnormal, why is it abnormal, how strong is the evidence, is it associated with transformer or feeder energy loss, and which cases should field teams investigate first?

## Design Principles

- Detection before generation
- Evidence before accusation
- Personal normality
- Peer context
- Grid context
- Human in the loop
- Closed-loop feedback
- Voice accessibility
- Simulation with purpose
- No fake metrics
- Graceful degradation without optional third-party services
