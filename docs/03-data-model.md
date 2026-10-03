# Data Model

PostgreSQL is the planned system of record. This document defines database design intent only; no migrations exist yet.

## Shared Enums

`AnomalyCause`: `NORMAL`, `THEFT_TAMPERING`, `METER_MALFUNCTION`, `COMMUNICATION_FAILURE`, `LEGITIMATE_ABNORMAL_CONSUMPTION`, `UNCERTAIN`

`RiskLevel`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

`CaseStatus`: `OPEN`, `AI_FLAGGED`, `INSPECTION_PENDING`, `UNDER_INVESTIGATION`, `CONFIRMED`, `DISMISSED`, `RESOLVED`

`CommunicationStatus`: `CONNECTED`, `DEGRADED`, `DISCONNECTED`, `UNKNOWN`

`MeterStatus`: `NORMAL`, `SUSPECTED_FAULT`, `FAULT`, `UNKNOWN`

`SimulationScenario`: `NORMAL`, `THEFT_TAMPERING`, `METER_MALFUNCTION`, `COMMUNICATION_FAILURE`, `SEASONAL_VARIATION`, `LEGITIMATE_ABNORMAL_CONSUMPTION`, `COORDINATED_THEFT`

`Language`: `EN`, `HI`, `OR`, `OTHER`

## Core Tables

### consumers

Fields: `id`, `consumer_id`, `category`, `sanctioned_load`, `tariff`, `transformer_id`, `feeder_id`, `area`, `created_at`

### telemetry_readings

Fields: `id`, `consumer_id`, `timestamp`, `voltage`, `current`, `power`, `energy`, `meter_status`, `communication_status`

### consumer_profiles

Fields: `consumer_id`, `historical_mean`, `historical_median`, `historical_std`, `historical_min`, `historical_max`, `expected_baseline`, `load_factor`, `night_ratio`, `peak_ratio`, `weekday_profile`, `weekend_profile`, `peer_group_id`, `profile_updated_at`

`expected_baseline` means expected behavior derived from historical patterns. It is not the minimum consumption.

### anomalies

Fields: `id`, `consumer_id`, `timestamp`, `anomaly_score`, `risk_score`, `predicted_cause`, `confidence`, `personal_deviation`, `peer_deviation`, `persistence_score`, `meter_health_score`, `communication_health_score`, `transformer_loss_score`, `cluster_score`, `evidence`, `model_version`

### transformers

Fields: `id`, `transformer_id`, `feeder_id`, `rated_capacity`, `expected_technical_loss_config`

### transformer_energy_snapshots

Fields: `transformer_id`, `timestamp`, `input_energy`, `consumer_energy`, `expected_technical_loss`, `unexplained_loss`

Concept:

```text
unexplained_loss = transformer_input_energy - total_consumer_energy - expected_technical_loss
```

### investigation_cases

Fields: `id`, `consumer_id`, `anomaly_id`, `risk_score`, `predicted_cause`, `priority`, `status`, `assigned_to`, `created_at`, `updated_at`

### field_observations

Fields: `id`, `case_id`, `investigator_id`, `timestamp`, `source`, `original_text`, `normalized_evidence`, `language`, `confidence`

`source`: `TEXT`, `VOICE`, `CHECKLIST`, `SYSTEM`

### case_resolutions

Fields: `case_id`, `predicted_cause`, `actual_outcome`, `resolution_notes`, `resolved_by`, `resolved_at`

### simulation_events

Fields: `id`, `scenario`, `target_consumers`, `transformer_id`, `severity`, `started_at`, `ended_at`, `ground_truth`

### audit_events

Fields: `id`, `actor`, `actor_role`, `action`, `resource_type`, `resource_id`, `timestamp`, `metadata`
