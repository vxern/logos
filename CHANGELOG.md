## Next (WIP)

- Fixed modal composers not passing through the right data.
- Fixed manually moving members to a dynamic VC causing multiple VCs to get created.
- Merged the role and resource notices into the information notice.
- Updated all notices + the `/profile roles` command to use components V2.

## 5.0.0

- Renamed the bot from `Logos` to `Rost`.
- Removed all of the language features.
- Removed non-Discord languages.
- Switched localisation files to be stored in Discord locales.

## 4.58.0

- Improved the UI of notices.

## 4.57.2

- Bumped dependencies.

## 4.57.1

- Fixed some strings not having the language localised.

## 4.57.0

- Bumped dependencies:
  - Standard:
    - `diff`: `^7.0.0` -> `^8.0.2`
    - `dotenv`: `^16.4.5` -> `^16.5.0`
    - `ioredis`: `^5.4.1` -> `^5.6.1`
    - `mongodb`: `^6.8.0` -> `^6.16.0`
    - `nanoid`: `^5.0.7` -> `^5.1.5`
    - `pino`: `^9.4.0` -> `^9.7.0`
    - `ravendb`: `^5.4.3` -> `^7.0.0`
    - `rethinkdb-ts`: `^2.6.1` -> `^2.7.0`
  - Developer:
    - `@biomejs/biome`: `1.8.3` -> `1.9.4`
    - `@types/bun`: `^1.1.7` -> `^1.2.14`
    - `@types/chai`: `^4.3.17` -> `^5.2.2`
    - `chai`: `^5.1.1` -> `^5.2.0`
    - `pino-pretty`: `^11.2.2` -> `^13.0.0`
    - `typescript`: `^5.5.4` -> `^5.8.`
- Removed dependencies:
  - `@types/diff`

## 4.56.3

- Pegged the ELD package to an NPM release rather than using a GitHub commit.

## 4.56.2

- Fixed the bot not reinstating prompts for documents that were never finalised.

## 4.56.1

- Fixed `examples` being a required property in the configuration of the CEFR feature.

## 4.56.0

- Added aliases for scripts:
  - `db:migrate` for `database:migrate`
  - `g:migration` for `generate:migration`
  - `l:sentences` for `load:sentences`
- Migrations are now written in JavaScript to prevent having to do type gymnastics.
- The codebase no longer tracks a history of document types.

## 4.55.0

- Fixed Logos showing the 'no information' message in response to `/word` when it only has
  entries of an `unknown` part of speech.
- Logos now recognises 27 new parts of speech:
	- Number
	- Ambiposition
	- Circumposition
	- Preposition
	- Postposition
	- Circumfix
	- Classifier
	- Proverb
	- Punctuation mark
	- Infix
	- Prefix
	- Root
	- Interfix
	- Suffix
	- Combining form
	- Diacritical mark
	- Prepositional phrase
	- Han character
	- Hanzi
	- Kanji
	- Hanja
	- Romanization
	- Logogram
	- Determinative
	- Contraction
	- Counter
	- Ideophone
	- Participle

## 4.54.0

- The source language can now be specified in the sigil feature.
- Multiple-word entries in the sigil feature can now also be found using `()`, `{}`, and `<>`.

## 4.53.0

- Labels are now shown on entries from Wiktionary.

## 4.52.2

- Bumped version of `dexonline-scraper` to `0.2.2`.

## 4.52.1

- Fixed issue with inquiry tickets being deleted.

## 4.52.0

- Added missing entry for `CzechoSlovak`.
- Bumped version of Discordeno from `^20.0.0` to `^21.0.0`.

## 4.51.2

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