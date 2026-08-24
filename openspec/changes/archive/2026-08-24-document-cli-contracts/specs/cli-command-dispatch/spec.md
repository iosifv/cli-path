## Purpose

How an invocation of the CLI reaches the work the user wanted, covering both the guided mode a user
gets by running the program bare and the direct subcommands they get by naming what they want.

## ADDED Requirements

### Requirement: Running the program bare offers a menu

When invoked with no arguments, the CLI SHALL present a menu of the actions available and carry out
the one the user selects. A user SHALL NOT need to know any command names to use the program.

#### Scenario: Invoked with no arguments

- **WHEN** the program is run with no arguments
- **THEN** a selectable menu of available actions is displayed

#### Scenario: An action is selected

- **WHEN** the user selects an action from the menu
- **THEN** that action runs, and the program exits when it completes

### Requirement: Naming a command runs it directly

When invoked with arguments, the CLI SHALL interpret the first as the name of a command and run it
without presenting a menu, so that invocations can be scripted and recorded.

#### Scenario: A command is named

- **WHEN** the program is run with a command name
- **THEN** that command runs directly and no menu is shown

#### Scenario: An unrecognised command is named

- **WHEN** the program is run with a name that matches no command
- **THEN** the user is told the command is unknown, and the program exits without running anything

### Requirement: Both entry points reach the same behaviour

An action offered by the menu and the command of the same name SHALL produce the same behaviour. A
command SHALL NOT be reachable through only one of the two entry points.

#### Scenario: The same action through each entry point

- **WHEN** an action is performed once through the menu and once by naming its command
- **THEN** both produce the same result

#### Scenario: A command is added

- **WHEN** a new user-facing command is added
- **THEN** it is reachable both by name and from the menu

### Requirement: Commands with several modes expose them as subcommands

A command offering distinct modes of operation SHALL expose each as a named subcommand, so a user
can reach a specific mode directly rather than selecting it interactively.

#### Scenario: Selecting a mode directly

- **WHEN** a user names both a command and one of its modes
- **THEN** that mode runs without further prompting

### Requirement: The reported version reflects the running installation

The CLI SHALL report the version of the installation actually executing, whether it was invoked
from a source checkout or as a globally installed program.

Version detection SHALL NOT assume the program was invoked from its own directory, since a globally
installed program runs from wherever the user happens to be. The CLI SHALL report which of the two
installations it found, and SHALL remain usable when it can determine neither.

#### Scenario: Invoked as a globally installed program

- **WHEN** the version is reported from a directory unrelated to the installation
- **THEN** the installed program's own version is reported, not that of any unrelated project in
  the working directory

#### Scenario: Invoked from a source checkout

- **WHEN** the version is reported from the program's own source directory
- **THEN** that checkout's version is reported, identified as the source installation

#### Scenario: No version can be determined

- **WHEN** neither installation can be located
- **THEN** the version is reported as unknown and the command completes

### Requirement: Output is presented consistently

A command's headings, labelled values, status lines and tables SHALL be produced through the
CLI's shared presentation layer, so that they are styled consistently wherever they originate.

A short confirmation message, an exception caught while producing other output, or content a
provider handed back that the CLI did not compose itself MAY be written to the terminal directly —
none of those fit the layer's value/status/table vocabulary, and forcing them through it would mean
styling text, or an object, the CLI does not control the shape of.

#### Scenario: A command reports a labelled value

- **WHEN** any command displays a labelled value, a status line, or a table
- **THEN** it is rendered by the shared presentation layer rather than written directly to the
  terminal

#### Scenario: A command reports something outside that vocabulary

- **WHEN** a command displays a short confirmation message, an exception it caught, or content a
  provider returned verbatim
- **THEN** it MAY be written directly to the terminal
