# cli-engine-adapter Specification

## Purpose

How the CLI obtains geocoding and routing results from a map provider, and the single result shape
every provider must be reduced to, so that what the user sees on the terminal is identical no
matter which provider answered.

## Requirements

### Requirement: A user chooses between the hosted service and their own provider key

The CLI SHALL support two interchangeable sources of map data: a hosted service that requires no
provider credentials of the user's own, and a direct connection to a map provider using a key the
user supplies. The hosted service SHALL be the default for a user who has never chosen.

The choice SHALL persist between invocations and SHALL be changeable without reinstalling or
editing files by hand.

#### Scenario: A new user has made no choice

- **WHEN** the CLI is invoked for the first time on a machine
- **THEN** the hosted service is used, and the user is not asked for a provider key

#### Scenario: A user switches to their own key

- **WHEN** a user selects the direct-provider source and supplies a valid key
- **THEN** subsequent lookups reach the provider directly, and the hosted service is not contacted

#### Scenario: An unrecognised source is configured

- **WHEN** the stored source is a value the CLI does not recognise
- **THEN** the CLI reports that no source is configured and performs no lookup

### Requirement: Both sources answer the same two questions

Each source SHALL support resolving a free-text query to a single formatted address, and resolving
an origin and a destination to a route between them. Selecting a different source SHALL NOT change
which operations are available.

#### Scenario: The same query against either source

- **WHEN** the same free-text query is resolved under each source in turn
- **THEN** both return a single formatted address string

### Requirement: A route is described by exactly five presentation-ready fields

A route result SHALL consist of exactly the fields `start`, `end`, `summary`, `distance` and
`duration`, and nothing the renderer must interpret further.

- `start` and `end` SHALL be formatted addresses, not the raw text the user typed.
- `summary` SHALL name the significant roads of the route.
- `distance` and `duration` SHALL be human-readable strings carrying their own units.

Numeric quantities SHALL NOT reach the renderer as raw magnitudes; unit selection, rounding and
pluralisation SHALL be resolved before the result is returned.

#### Scenario: Rendering a route

- **WHEN** a route result is rendered
- **THEN** all five fields are displayed, and the renderer applies no unit conversion, rounding or
  number formatting of its own

#### Scenario: The same route under each source

- **WHEN** the same origin and destination are routed under each source in turn
- **THEN** both results populate all five fields, and neither is visibly formatted differently from
  the other

#### Scenario: A provider reports distance and duration as raw magnitudes

- **WHEN** the underlying provider reports a distance in metres and a duration in seconds
- **THEN** they are converted to human-readable strings before the result is returned, not at
  render time

### Requirement: The result shape is a shared contract

The five-field shape SHALL be treated as a contract between every source and the renderer. A change
to it SHALL be applied to all sources and to the renderer together, so that no source can produce a
result the renderer cannot display.

#### Scenario: A new source is introduced

- **WHEN** a source backed by a different map provider is added
- **THEN** it maps that provider's response onto the five fields, and the renderer is not modified

### Requirement: A failed lookup explains itself and stops

When a lookup cannot be completed, the CLI SHALL tell the user what went wrong in terms they can
act on, and SHALL NOT present an empty or partially populated route as if it were a result.

The explanation SHALL distinguish being unable to reach the service from the service declining the
request.

#### Scenario: The hosted service declines the request

- **WHEN** the hosted service refuses a lookup and explains why
- **THEN** that explanation is shown to the user and no route is rendered

#### Scenario: The hosted service is unreachable

- **WHEN** the hosted service cannot be contacted at all
- **THEN** the user is told the service could not be reached, distinguishably from a refusal

#### Scenario: The user's own provider key is missing

- **WHEN** the direct-provider source is selected but no key is stored
- **THEN** the user is told a key is required, and no provider call is attempted
