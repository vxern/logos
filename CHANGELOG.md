## 4.52.2

- Fixed Logos setting the same guilds up multiple times, causing serious issues when
  the bot is left running for longer periods of time.

## 4.51.1

- Fixed Logos running out of memory.

## 4.51.0

- Added the ability to load 'plugins' at start-up to extend Logos by custom code.

## 4.50.0

- Added new commands:
  - `/pronunciation`
  - `/relations`
  - `/examples`

## 4.49.4

- Fixed the source button sometimes not showing in the `/word` command.
- Fixed the "Show message in chat" button showing even if the message is public.

## 4.49.3

- Fixed `CacheStore` deleting `Guild`s instead of `GuildStatistics` and vice-versa.
- Fixed word sigils not picking up non-Latin characters.

## 4.49.2

- Compiled independent functions in `role-selection.ts` into `RoleSelectionComponent`.

## 4.49.1

- Moved the bulk of the logic of the `/game` command into `GameViewComponent`.
- Refactored the implementation of `GameViewComponent`.
- Fixed `DexonlineAdapter` applying its own formatting to the etymology section.

## 4.49.0

- Moved the bulk of the logic of the `/word` command into `WordInformationComponent`.
- Refactored the implementation of `WordInformationComponent`.
- Added formatters for the remaining dictionary sections:
  - Relations
  - Examples
  - Pronunciation
  - Frequency
  - Notes

## 4.48.2

- Made various conventional and stylistic changes to the code.

## 4.48.1

- Fixed the CouchDB query interface not taking the collection into account.
- Fixed the RavenDB query interface not taking the collection into account.
- Fixed SonarLint style issues in migrations.
- Fixed the `shutdown()` call never resolving.