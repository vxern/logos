## Setup Logos

### Step 1: Let's get the bot up and running.

To get Logos running, all you need at the start is [Bun](https://bun.sh/docs/installation), a runtime for TypeScript.

The instance will be missing a chunk of the features that come from its integrations, but we can forget about those for now. We'll set the rest up as we go.

### Step 2: Configuring the database

Logos supports a selection of NoSQL databases.

Out of the box, you have the choice between:
<details>
    <summary>MongoDB (<a href="https://mongodb.com/products/platform/atlas-database">website</a>)</summary>
</details>
<details>
    <summary>RavenDB (<a href="https://ravendb.net">website</a>)</summary>
</details>
<details>
    <summary>CouchDB (<a href="https://couchdb.apache.org">website</a>)</summary>
</details>
<details>
    <summary>RethinkDB (<a href="https://rethinkdb.com/">website</a>)</summary>
</details>
<details>
    <summary>In-memory database (default; not recommended)</summary>
</details>

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