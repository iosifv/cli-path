## Purpose

What the CLI remembers between invocations — settings, credentials and saved locations — and the
guarantees that keep an upgraded installation working against a store written by an older version
of the program.

## ADDED Requirements

### Requirement: State persists between invocations

The CLI SHALL retain the user's chosen map source, target environment, credentials and saved
locations across separate invocations, in per-user storage outside the installation directory, so
that reinstalling or upgrading the program does not discard them.

#### Scenario: Settings survive a restart

- **WHEN** a user changes a setting and later invokes the CLI again
- **THEN** the changed setting is still in effect

#### Scenario: Settings survive an upgrade

- **WHEN** the program is upgraded to a newer version
- **THEN** previously stored settings, credentials and saved locations remain available

### Requirement: Persisted state has exactly one owner

All reads and writes of persisted state SHALL go through a single component. No other part of the
CLI SHALL read or write the underlying store directly.

#### Scenario: A command needs a stored value

- **WHEN** any command requires a persisted value
- **THEN** it obtains it through the owning component rather than reading the store itself

### Requirement: Every known setting has a value

The CLI SHALL declare a default for each setting it relies on, and SHALL ensure every declared
setting is present before any command runs. A setting missing from an existing store SHALL be
back-filled with its default rather than read as absent.

Consequently, a setting introduced by a new version SHALL become available to a user upgrading from
an older version without any action on their part.

#### Scenario: An existing store predates a setting

- **WHEN** a version that declares a new setting runs against a store written before it existed
- **THEN** the setting is present with its default value from that invocation onward

#### Scenario: A store is empty or absent

- **WHEN** the CLI runs with no store at all
- **THEN** a store is created with every declared setting at its default

### Requirement: A caller chooses whether a missing value is an error

The CLI SHALL offer two ways to read a persisted value: one that treats absence as an error and
stops, and one that reports absence as an ordinary result. Callers SHALL choose according to
whether the value is required for the work at hand.

A value that is merely being reported on, or offered as the current setting in a prompt, SHALL NOT
be read in the form that treats absence as an error.

#### Scenario: A required credential is missing

- **WHEN** an operation that cannot proceed without a credential finds none stored
- **THEN** it fails with a message naming what is missing

#### Scenario: An optional value is missing while reporting status

- **WHEN** a status or configuration display reads a value that has never been set
- **THEN** it reports the value as unset and continues, rather than failing

### Requirement: Retired environment names are migrated

Because the target environment is persisted per user, the CLI SHALL maintain a mapping from
environment names it no longer serves to their replacements, and SHALL rewrite a stored retired
name to its replacement before that value is used.

Migration SHALL occur automatically on an ordinary invocation, without the user being asked to act.

An environment name SHALL NOT be retired without a corresponding entry in that mapping, since a
stored name with no known replacement resolves to no service address at all.

#### Scenario: A store holds a retired environment name

- **WHEN** the CLI runs against a store whose environment is a name that has been retired
- **THEN** the stored value is rewritten to its replacement, and the request that follows reaches
  the replacement service

#### Scenario: A store holds a current environment name

- **WHEN** the stored environment is one the CLI still serves
- **THEN** the value is left unchanged

### Requirement: Saved locations are named addresses

The CLI SHALL let a user store resolved addresses under short names, list them, retrieve one by
name, remove one by name, and remove all of them at once. Saved locations SHALL be usable in place
of typing an address in full.

#### Scenario: Saving and reusing a location

- **WHEN** a user saves a resolved address under a name and later selects that name
- **THEN** the stored address is used, and no new lookup of the original query is performed

#### Scenario: Removing all saved locations

- **WHEN** a user purges saved locations
- **THEN** none remain, and other settings and credentials are unaffected
