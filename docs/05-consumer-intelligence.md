# Consumer Intelligence

Purpose: define what normal means for each consumer.

## Planned Inputs

- historical consumption
- voltage, current, power, and energy readings
- consumer category
- sanctioned load
- tariff
- transformer
- feeder and area
- weekday/weekend and time-of-day context

## Baseline Concept

Baseline is expected behavior derived from historical patterns, not minimum consumption. It may include rolling means, medians, variance, load factor, peak ratio, night ratio, and seasonal context.

## Peer Groups

Initial peer groups may use:

- consumer category
- sanctioned-load bucket
- transformer
- feeder or area where useful

## Output

- consumer profile
- expected baseline
- peer group ID
- deviation features for the anomaly engine
