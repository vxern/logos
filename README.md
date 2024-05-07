## Contribute to Logos

> If you're on Windows, it is recommended that you use WSL. 
> 
> Before you start, make sure you have the latest versions of the following software installed on your system:
> - [Bun](https://bun.sh/docs/installation) - running the program & managing dependencies
> - [RavenDB](https://ravendb.net/download) - storing non-volatile data
> - [Redis](https://redis.io/docs/install/install-redis/) - storing volatile data
> - [Lavalink](https://github.com/lavalink-devs/Lavalink/releases/latest) - playing audio
>
> Additionally, to make full use of Logos' capabilities, you will also need to obtain API keys from the following services:
> - [Discord](https://discord.com/developers/applications) - running Logos
> - [DeepL](https://www.deepl.com/pro#developer) - translation
> - [RapidAPI](https://rapidapi.com/hub) - querying various API servers
>   - [Google Translate](https://rapidapi.com/IRCTCAPI/api/google-translator9/) - translation
>   - [WordsAPI](https://rapidapi.com/dpventures/api/wordsapi/) - English dictionary
>   - [Dicolink](https://rapidapi.com/dicolink/api/dicolink/) - French dictionary

To start contributing, first create your own working copy of `logos` that you can freely make changes to. You can do this by going to [the Logos repository](https://github.com/vxern/logos) and [forking it](https://github.com/vxern/logos/fork).

Once you have forked the repository, `git clone` it to download it locally:
```
git clone https://github.com/your-username-here/logos.git
```

Once you have your local copy of `logos` ready, run the following command to install all the necessary dependencies.
```
bun install
```

Then, set Logos up. This command will run all the necessary setup scripts:
```
bun setup
```

Afterwards, to ensure the setup ran smoothly and the repository is ready to go, run the test suite:
```
bun test
```

And just like that, you're ready to develop! However, before you start contributing to the project, first make sure to read the [Style Guidelines](#style-guidelines) below, which broadly set out how code in the project should be written.

Once you've made your changes, create a pull request to merge them into `logos`, but before you do that, make sure of the following:
- Run the formatter.
  - Ideally, you should have your IDE set up in such a way where it would re-format the file on every change. However, just to make sure it complies with Biome and the linter ruleset in `biome.json`, run `bun lint` before you commit your changes.
- Write tests for your changes, using the existing tests as a guideline for how they should look.
  - If you can't write a test and the reason for that isn't immediately obvious, state why they couldn't be written.
- Keep your pull requests small, ideally up to 200 lines of code, or 400 at the maximum. This makes it easier for potential reviewers of your PR to not get discouraged reading a massive PR with tons of changes, and increases your chances of having your PR merged quickly.

## Good-to-knows

- Time is stored and measured in milliseconds by default.

## Style Guidelines

- <u>British English</u> spelling is used for everything other than string keys (localisations), special `custom_id`s, as well as property names in objects stored or transferred out of Logos. This would include database documents and Redis entries. 
- All external packages are imported with an alias, for example `import * as package` or `import package`.
- `===` is used over `==` for equality checks.
  - `==` does type coalescing, which although is not an issue most of the time, those cases where it does make a difference need to be eliminated.
- `??` is used over `||` for coalescing values.
  - `||` coalesces falsy values over matching against exclusively `undefined` and `null`.
- `value === undefined` is used over `!value`, similarly use `value !== undefined` over `!!value`.
  - This is for the same reason as outlined in the mention of `==`.
- `undefined` is used over `null`.
  - `null` is only permitted when making the distinction between "no value" (`undefined`) and "remove this value" (`null`).
- `#` is used for declaring private API members. Do not use TypeScript's `public`, `protected` and `private` keywords.
  - `private` is permitted for hiding constructors.
- `return undefined;` is used over `return;` when the return type can be `undefined`.
- Union types are used with a clearly defined key->value mapping object over `enum`s.
  - `enum`s do not exist in vanilla JavaScript, and similar deviations from TypeScript being a true superset should be avoided.
- Complete forms of words are used whenever possible; Do not shorten words unless there's a good reason to other than simple brevity. Acronyms are fine. "ID" is also okay.
  - For example, use 'request', 'transaction', 'diagnostics' and 'source' over 'req', 'tx', 'diag' or 'src'.
- `+=` and `-=` are used over `++` and `--`.
  - These are more in line with other similar operations such as `*=`, `/=` and `**=`. The assignment is also explicit.
- `[]` is used on tuples, `.at()` is used on arrays.