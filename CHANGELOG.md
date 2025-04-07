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