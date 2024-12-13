## 4.49.1

- Moved the bulk of the logic of the `/word` command into `GameViewComponent`.
- Refactored the implementation of `GameViewComponent`.

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