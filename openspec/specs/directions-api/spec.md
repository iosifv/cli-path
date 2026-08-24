# directions-api Specification

## Purpose

The hosted endpoints the `clip` CLI calls so a user can look up addresses and routes without
holding map-provider credentials of their own, presented in a provider-independent shape the
terminal renders directly.

## Requirements

### Requirement: Address lookup

The API SHALL accept a free-text place query and return a single formatted address string.

#### Scenario: A place matches

- **WHEN** a caller submits a query that the map provider resolves
- **THEN** the API returns `200` with a `formatted_address` string for the best match

#### Scenario: No place matches

- **WHEN** a caller submits a query the map provider resolves to nothing
- **THEN** the API returns `404` and no address

### Requirement: Route lookup

The API SHALL accept a free-text origin and destination and return a route described by exactly
five fields: `start`, `end`, `summary`, `distance`, and `duration`.

The CLI renders these five fields verbatim, so each MUST be a display-ready string. No other
field may be required for a route to render, and the set MUST NOT change without a corresponding
change in the client.

#### Scenario: A route exists

- **WHEN** a caller submits an origin and destination that both resolve and are connected
- **THEN** the API returns `200` with `start`, `end`, `summary`, `distance` and `duration`, each
  a non-empty string

#### Scenario: An endpoint does not resolve

- **WHEN** either the origin or the destination resolves to no place
- **THEN** the API returns `404` and does not attempt to compute a route

#### Scenario: No route connects the endpoints

- **WHEN** both endpoints resolve but no route exists between them for the requested travel mode
- **THEN** the API returns `404`

### Requirement: Human-readable distance and duration

Distance and duration SHALL be returned as pre-formatted human-readable strings, not raw
magnitudes, so that every engine the CLI supports renders identically.

#### Scenario: Distances are scaled to a natural unit

- **WHEN** a route is shorter than one kilometre
- **THEN** `distance` is expressed in metres, and otherwise in kilometres

#### Scenario: Durations are expressed in natural units

- **WHEN** a route takes one hour and twenty-three minutes
- **THEN** `duration` reads as hours and minutes rather than as a count of seconds

#### Scenario: A very short route still reports a duration

- **WHEN** a route takes less than one minute
- **THEN** `duration` reports one minute rather than zero

### Requirement: Route summary names roads

`summary` SHALL name the roads the route principally follows, so a reader can recognise the route
at a glance.

#### Scenario: The route follows named roads

- **WHEN** a route spends most of its distance on two named roads
- **THEN** `summary` names those two roads

#### Scenario: The route follows unnamed ways

- **WHEN** the route's ways carry no usable names
- **THEN** `summary` falls back to describing the travel mode rather than returning empty

### Requirement: Travel mode selection

The API SHALL accept an optional travel mode on a route lookup and default to driving when it is
omitted.

#### Scenario: Travel mode omitted

- **WHEN** a caller submits a route lookup without a travel mode
- **THEN** the API computes a driving route

#### Scenario: Unsupported travel mode

- **WHEN** a caller submits a travel mode the provider does not support
- **THEN** the API returns `400` and does not contact the provider

### Requirement: Authenticated access

Address and route lookups SHALL require a valid bearer token issued by the project's identity
provider, and the API MUST resolve that token to an identity before doing any billable work.

#### Scenario: Token missing or malformed

- **WHEN** a caller omits the bearer token or sends a malformed one
- **THEN** the API returns `401` and contacts no map provider

#### Scenario: Token rejected

- **WHEN** the identity provider rejects the token
- **THEN** the API returns `401`

#### Scenario: Token carries no identity

- **WHEN** the identity provider accepts the token but returns no subject for it
- **THEN** the API returns `401`, because an anonymous caller must not be admitted

### Requirement: Real HTTP status codes

The API SHALL signal every outcome with the HTTP status code that matches it, so clients can rely
on transport-level status rather than inspecting the response body.

Each response also carries a machine-readable outcome in its body, but that value is diagnostic
and MUST NOT be the only way to detect failure.

#### Scenario: Failures are distinguishable by status

- **WHEN** a request fails validation, authentication, lookup, quota, or the provider
- **THEN** the API returns `400`, `401`, `404`, `429`, or `502` respectively, never a single
  status for every failure class

#### Scenario: Success carries a success status

- **WHEN** a lookup succeeds
- **THEN** the API returns `200`

### Requirement: Request validation

The API SHALL reject a malformed request body before authenticating the caller or contacting any
provider.

#### Scenario: Required field missing

- **WHEN** a caller omits a required field
- **THEN** the API returns `400` describing which field failed

#### Scenario: Unknown field supplied

- **WHEN** a caller includes a field the endpoint does not define
- **THEN** the API returns `400`

### Requirement: Health check

The API SHALL expose a health endpoint that requires no authentication and consumes no quota, so
it is usable for uninterrupted monitoring.

#### Scenario: Health check without credentials

- **WHEN** an unauthenticated caller requests the health endpoint
- **THEN** the API returns `200` reporting whether the map provider and usage counter are
  configured, and the current usage against the cap

#### Scenario: Health check does not consume quota

- **WHEN** the health endpoint is called repeatedly
- **THEN** the monthly usage count is unchanged
