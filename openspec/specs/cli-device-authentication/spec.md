# cli-device-authentication Specification

## Purpose

How a user of a terminal program proves who they are to the hosted service without ever typing
credentials into the terminal, and what the CLI keeps once they have.

## Requirements

### Requirement: Credentials are never entered in the terminal

The CLI SHALL authenticate the user by directing them to complete sign-in in a browser and then
learning the outcome, rather than by prompting for a username, password, or any other secret.

The CLI SHALL support the identity providers the account service offers without needing to know
which one the user chose.

#### Scenario: A user authenticates

- **WHEN** a user starts authentication
- **THEN** the CLI displays a verification address and a short code, and at no point prompts for a
  password

#### Scenario: A user signs in with any supported provider

- **WHEN** a user completes sign-in with any provider the account service offers
- **THEN** authentication succeeds, and the CLI behaves identically regardless of which was used

### Requirement: The user is given a code and somewhere to enter it

On starting authentication the CLI SHALL display a short verification code and an address at which
to enter it. It SHALL display an address that already carries the code, so the user need not
transcribe it, while still showing the code so they can confirm what they are approving.

#### Scenario: Authentication begins

- **WHEN** authentication starts
- **THEN** both the verification code and an address containing that code are printed before any
  waiting begins

### Requirement: The CLI waits for approval and reports progress

While waiting for the user to complete sign-in, the CLI SHALL poll the account service on a fixed
interval and SHALL show that it is still waiting and when it will next check. It SHALL continue
until authentication succeeds.

Polling SHALL NOT be so frequent that the account service rate-limits it; the interval SHALL be
several seconds.

#### Scenario: The user has not yet approved

- **WHEN** a poll finds sign-in still incomplete
- **THEN** the CLI reports why it is still waiting and checks again after the interval

#### Scenario: The user approves

- **WHEN** a poll finds sign-in complete
- **THEN** waiting stops and the CLI reports success

### Requirement: The identity scope is requested explicitly

The CLI SHALL explicitly request access to the user's identity and profile when starting
authentication. Omitting it SHALL be treated as a defect rather than a preference, because
authentication then succeeds while the profile is silently empty, and the failure surfaces later
and far from its cause.

#### Scenario: Requesting profile access

- **WHEN** authentication starts
- **THEN** the request asks for the user's identity and profile

#### Scenario: A token that resolves to no identity

- **WHEN** authentication returns a token whose profile carries no subject
- **THEN** the CLI treats authentication as failed rather than storing an empty profile

### Requirement: The profile is obtained from the account service

The CLI SHALL obtain the user's display profile from the account service that issued the token,
using the token it has just received.

The CLI SHALL NOT depend on the hosted map service to learn who the user is. Authentication SHALL
succeed whether or not that service is reachable, deployed, or serving any particular endpoint.

#### Scenario: The hosted map service is unavailable

- **WHEN** a user authenticates while the hosted map service is unreachable
- **THEN** authentication completes and the user's profile is stored

#### Scenario: The hosted map service does not offer an identity endpoint

- **WHEN** the hosted map service serves no endpoint dedicated to identity
- **THEN** authentication is unaffected, because the profile came from the account service

### Requirement: The token and profile are persisted

On success the CLI SHALL persist the access token and the user's profile, so that later commands
authenticate without repeating the flow, and can display who is signed in.

#### Scenario: A command after authenticating

- **WHEN** a command that calls the hosted service runs after successful authentication
- **THEN** it presents the stored token without prompting the user again

### Requirement: Commands tolerate not being authenticated

A command that reports on the CLI's state SHALL remain usable when no authentication has taken
place. Absence of a token or profile SHALL be reported as something the user can fix, and SHALL NOT
prevent the rest of that command's output from being produced.

#### Scenario: Checking status before authenticating

- **WHEN** a user runs the status command having never authenticated
- **THEN** the command completes, reporting that no user is signed in alongside its other output

#### Scenario: Checking status after authenticating

- **WHEN** a user runs the status command after authenticating
- **THEN** the command reports the signed-in user's name
