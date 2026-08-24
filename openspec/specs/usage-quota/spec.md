# usage-quota Specification

## Purpose

The global monthly ceiling on hosted lookups, which keeps the project's own usage inside the free
tier of whichever map provider backs it, and defines what callers see when that ceiling is
reached or when usage cannot be accounted for.

## Requirements

### Requirement: Global monthly cap

The service SHALL enforce a single global cap on the number of billable lookups it performs per
calendar month, shared across all callers rather than allocated per user.

The cap SHALL be configurable without a code change.

#### Scenario: Usage below the cap

- **WHEN** a caller makes a lookup and the month's usage is below the cap
- **THEN** the lookup proceeds and the response reports the usage count and the cap

#### Scenario: Usage at the cap

- **WHEN** a caller makes a lookup and the month's usage has reached the cap
- **THEN** the API returns `429` with guidance to supply their own provider key, and performs no
  provider call

#### Scenario: A new month

- **WHEN** the calendar month changes
- **THEN** usage is counted afresh, independently of the previous month

### Requirement: A lookup costs one unit

One client request SHALL consume exactly one unit of the monthly budget, regardless of how many
upstream provider calls the service makes to satisfy it.

#### Scenario: A route lookup requiring several provider calls

- **WHEN** a route lookup requires resolving both endpoints and then computing a route
- **THEN** the month's usage increases by one, not by the number of provider calls

### Requirement: Claiming a call is atomic

The check against the cap and the recording of usage SHALL be a single indivisible operation, so
that concurrent requests at the boundary cannot all be admitted.

#### Scenario: Concurrent requests at the boundary

- **WHEN** two requests arrive simultaneously with exactly one unit of budget remaining
- **THEN** exactly one is admitted and the other receives `429`

### Requirement: Unusable calls are refunded

A claimed unit SHALL be returned to the budget when the request does not result in usable work,
so that failures outside the caller's control do not consume their budget.

#### Scenario: The request is rejected at the cap

- **WHEN** a claim is rejected because it would exceed the cap
- **THEN** the recorded usage is left unchanged by that rejected attempt

#### Scenario: The provider fails

- **WHEN** a claim succeeds but the map provider is unreachable or returns an error
- **THEN** the claimed unit is returned to the budget

#### Scenario: A refund itself fails

- **WHEN** returning a claimed unit fails
- **THEN** the original error is still reported to the caller and is not masked by the refund
  failure

### Requirement: Accounting never fails open

If usage cannot be accounted for, the service SHALL refuse the request rather than serve it
unmetered.

#### Scenario: The usage store is unreachable

- **WHEN** the usage store cannot be reached
- **THEN** the API returns `503` and performs no provider call

#### Scenario: The usage store is not configured

- **WHEN** the deployment has no usage store configured
- **THEN** the API returns `503` rather than treating usage as zero

#### Scenario: Quota enforcement is deliberately disabled

- **WHEN** an operator explicitly disables quota enforcement for local development
- **THEN** lookups proceed unmetered, and this MUST require an explicit opt-in rather than being
  the consequence of missing configuration

### Requirement: Usage is observable

The service SHALL report current usage against the cap without requiring a billable lookup, so
remaining budget can be monitored.

#### Scenario: Reading usage

- **WHEN** the health endpoint is queried
- **THEN** it reports the month's usage count and the configured cap without incrementing usage
