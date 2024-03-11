## Contribute to Logos

> Before you start, make sure you have the latest versions of the following software installed on your system:
> - Node.js + NPM - running the program & managing dependencies
> - RavenDB - storing permanent data
> - Redis - storing temporary/external data
> - Lavalink - playing audio
>
> Additionally, to make full use of Logos' capabilities, you will also need to obtain API keys from the following services:
> - Discord - running the bot
> - DeepL - translation
> - RapidAPI - querying various API servers
>   - [Google Translate](https://rapidapi.com/IRCTCAPI/api/google-translator9/) - translation
>   - [WordsAPI](https://rapidapi.com/dpventures/api/wordsapi/) - English dictionary
>   - [Dicolink](https://rapidapi.com/dicolink/api/dicolink/) - French dictionary

To start contributing, first create your own working copy of `logos` that you can freely make changes to. You can do this by going to https://github.com/vxern/logos and forking the repository.

Once you have forked the repository, `git clone` it to download it locally:
```
git clone https://github.com/your-username-here/logos.git
```

Once you have your local copy of `logos` ready, run the following command to install all the necessary dependencies, and run all the necessary scripts to set the bot up:
```
npm install
```

Afterwards, just to ensure the setup ran smoothly and the repository is ready to go, run the test suite:
```
npm test
```

And just like that, you're ready to develop! However, before you start contributing to the project, first make sure to read the [Style Guidelines](#style-guidelines) below, which broadly set out how code in the project should be written.

Once you've made your changes, create a pull request to merge them into `logos`, but before you do that, make sure of the following:
- Run the formatter.
  - Ideally, you should have your IDE set up in such a way where it would re-format the file on every change. However, just to make sure it complies with Biome and the linter ruleset in `biome.json`, run `npm run lint` before you commit your changes.
- Write tests for your changes, using the existing tests as a guideline for how they should look.
  - If you can't write a test and the reason for that isn't immediately obvious, state why they couldn't be written.
- Keep your pull requests small, ideally up to 200 lines of code, or 400 at the maximum. This makes it easier for potential reviewers of your PR to not get discouraged reading a massive PR with tons of changes, and increases your chances of having your PR merged quickly.

## Style Guidelines

- Use <u>British English</u> spelling for everything other than string keys (localisations), special `custom_id`s, as well as property names in objects stored or transferred out of Logos. This would include database documents and Redis entries. 
- Use `===` for equality checks. Do not use `==` as it is less strict.
- Use `??` for coalescing values. Do not use `||` as it is less strict.
- Use `value === undefined` over `!value`, similarly use `value !== undefined` over `!!value`.
- Use `undefined` over `null`.
  - `null` is permitted when making the distinction between "no value" (`undefined`) and "remove this value" (`null`).
- Use `#` for declaring private API members. Do not use TypeScript's `public`, `protected` and `private` keywords.
  - `private` is permitted for hiding constructors.
- Use `return undefined;` over `return;` when the return type can be `undefined`.
