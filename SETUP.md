## Setup Logos

### Step 0: Download Logos.

You can always get the latest release of Logos [here](https://github.com/vxern/logos/releases/latest).

To download the release, simply download your archive of choice (.zip, .tar.gz) under 'Assets', then unzip the files.

### Step 1: Let's start.

To get a minimal instance of Logos up and running, you only need to have [Bun](https://bun.sh/docs/installation) installed.

Before you can start the bot, you will need to create an `.env` file storing your bot's Discord token:
```
DISCORD_TOKEN=<token goes here>
```

To start the bot:

```
bun start
```

If everything ran smoothly, you should now have a live Logos instance!

> Note: You are running a minimal instance. A large chunk of Logos' features will be unavailable yet. The rest of the setup guide will teach you how to enable (or disable!) each piece of functionality one-by-one.

### Step 2: Configuring the database

> Without configuration, Logos will store its documents in memory, and any documents created during the bot's lifecycle will be lost on restart.
> 
> If you'd prefer that your data be kept, you will need to configure Logos to use a database.
>
> [*If not, feel free to skip to the next section.*](#step-3-configuring-a-cache-database)

Logos comes with a selection of NoSQL databases to use out of the box, giving you the flexibility of deciding which solution you're going with.

- <details>
    <summary>MongoDB (<a href="https://mongodb.com/products/platform/atlas-database">Official Website</a>, <a href="https://mongodb.com/docs/manual/administration/install-community/">Setup Guide</a>)</summary>
    To use MongoDB with Logos, add the following credentials to your `.env` file:
    ```
    DATABASE_SOLUTION=mongodb # Tell Logos to use MongoDB as its database driver.  
    # MONGODB_USERNAME=       # (optional for unsecured instances) Username for authorisation.
    # MONGODB_PASSWORD=       # (optional for unsecured instances) Password for authorisation.
    MONGODB_HOST=127.0.0.1    # Address of your MongoDB instance. 
    MONGODB_PORT=27017        # Port your MongoDB instance is operating at. (MongoDB uses 27017 by default)
    MONGODB_DATABASE=logos    # Name of your database. 
    ```
  </details>
- <details>
    <summary>RavenDB (<a href="https://ravendb.net">Official Website</a>, <a href="https://ravendb.net/docs/article-page/6.0/csharp/start/installation/setup-wizard">Setup Guide</a>)</summary>
    To use RavenDB with Logos, add the following credentials to your `.env` file:
    ```
    DATABASE_SOLUTION=ravendb # Tell Logos to use RavenDB as its database driver. 
    RAVENDB_HOST=127.0.0.1    # Address of your RavenDB instance.
    RAVENDB_PORT=8080         # Port your RavenDB instance is operating at. (RavenDB uses 8080 by default)
    RAVENDB_DATABASE=logos    # Name of your database.
    # RAVENDB_SECURE=         # (optional for unsecured instances) Whether to establish a secure connection.
                              # If true, Logos will attempt to read a `.cert.pfx` file from the root directory.  
    ```
  </details>
- <details>
    <summary>CouchDB (<a href="https://couchdb.apache.org">Official Website</a>, <a href="https://docs.couchdb.org/en/stable/install/index.html">Setup Guide</a>)</summary>
    To use CouchDB with Logos, add the following credentials to your `.env` file:
    ```
    DATABASE_SOLUTION=couchdb # Tell Logos to use CouchDB as its database driver.
    COUCHDB_USERNAME=admin    # Username for authorisation.
    COUCHDB_PASSWORD=password # Password for authorisation.
    COUCHDB_HOST=127.0.0.1    # Address of your CouchDB instance.
    COUCHDB_PORT=5984         # Port your CouchDB instance is operating at. (CouchDB uses 5984 by default)
    COUCHDB_DATABASE=logos    # Name of your database.
    ```
  </details>
- <details>
    <summary>RethinkDB (<a href="https://rethinkdb.com/">Official Website</a>, <a href="https://rethinkdb.com/docs/install/">Setup Guide</a>)</summary>
    To use RethinkDB with Logos, add the following credentials to your `.env` file:
    ```
    DATABASE_SOLUTION=rethinkdb # Tell Logos to use RethinkDB as its database driver.
    # RETHINKDB_USERNAME=       # (optional for unsecured instances) Username for authorisation.
    # RETHINKDB_PASSWORD=       # (optional for unsecured instances) Password for authorisation.
    RETHINKDB_HOST=127.0.0.1    # Address of your RethinkDB instance.
    RETHINKDB_PORT=28015        # Port your RethinkDB instance is operating at. (RethinkDB uses 28015 by default)
    RETHINKDB_DATABASE=logos    # Name of your database.
    ```
  </details>
- <details>
    <summary>In-memory database</summary>
    To tell Logos you're fine with running an in-memory database, add the following record to your `.env` file:
    ```
    DATABASE_SOLUTION=none # Tell Logos to store documents in memory.
    ```
</details>

> Note: Logos follows each database's native storage conventions when storing documents, making it predictable how your
> data will look regardless of the database you choose to go with.

### Step 3: Configuring a volatile database

> The `/game` command needs sentence pairs to operate. Sentence pairs are loaded onto and stored in a volatile, Redis-compatible database.
> 
> If you'd like to support the `/game` command, you will need to configure a volatile database for sentence pairs.
> 
> [*If not, feel free to skip to the next section.*](#step-4-configuring-the-audio-node) 

Logos will work with any Redis-compatible database, whether that's Redis itself, Dragonfly, KeyDB, or something else. The choice is up to you.

Regardless of your choice, the credentials to add to `.env` for all of these databases are as follows:
```
REDIS_HOST=127.0.0.1 # Address of your database instance. 
REDIS_PORT=6379      # Port your database instance is operating at. (Redis uses 6379 by default)
# REDIS_PASSWORD=    # (optional for unsecured instances) Password for authorisation.
```

### Step 4: Configuring the audio node

> The music service needs a Lavalink node to operate.
> 
> If you'd like Logos to play music, you will need to add credentials of a Lavalink node to connect to.
> 
> [*If not, feel free to skip to the next section.*](#step-5-configuring-language-integrations)

You do not necessarily need to set up a Lavalink node yourself; there are public nodes out there that you can connect to and use. However, if you are looking for high reliability, it would usually be a good idea to host a node yourself.

The credentials to add to `.env` for Lavalink are as follows:
```
LAVALINK_HOST=127.0.0.1           # Address of your Lavalink instance.
LAVALINK_PORT=2333                # Port your Lavalink instance operates at.
LAVALINK_PASSWORD=youshallnotpass # Password for authorisation.
```

### Step 5: Configuring language integrations

> Logos relies on third-party integrations to serve much of its language content, whether that's translations, definitions, or otherwise.
> 
> If you'd like to set up third-party language integrations, the following steps will outline where to get each credential from, and what `.env` records to add to make each one work.
> 
> [*If not, then that's it! You're all set.*](#thats-all)

### Step 5.1: RapidAPI

> RapidAPI is a collection of APIs that are each queryable using the same API token. Logos uses a number of integrations via RapidAPI.

1. Sign up / log in [here](https://rapidapi.com/auth).
2. Create an app [here](https://rapidapi.com/developer/apps/new-app). Name the app 'Logos'. 
3. Subscribe to APIs:
   - Translators:
     - [Google Translate](https://rapidapi.com/IRCTCAPI/api/google-translator9) (free plan @ 1,000 requests per month)
     - [Lingvanex](https://rapidapi.com/dpventures/api/wordsapi) (free plan @ 500,000 characters per month)
   - Dictionaries:
     - [Dicolink](https://rapidapi.com/dicolink/api/dicolink) (free plan @ 500,000 requests per month (you heard right, *requests*))
     - [WordsAPI](https://rapidapi.com/dpventures/api/wordsapi) (free plan @ 2,500 requests per day)
4. Add a record for RapidAPI to your `.env` file:
```
SECRET_RAPID_API=<token goes here>
```

### Step 5.2: DeepL

> Logos uses DeepL for providing its translation services. The free plan comes with a limit of 500,000 characters per month.

To get a DeepL token, you will need to have a DeepL account.

1. Sign up [here](https://deepl.com/signup).
2. Create an API key [here](https://deepl.com/your-account/keys). Name the API key 'Logos'.
3. Add a record for DeepL to your `.env` file:
```
SECRET_DEEPL=<token goes here>
```

### Step 5.3: Wordnik

> Logos uses Wordnik to provide information about words in English. The free plan comes with a limit of 100 calls per hour.

To get a Wordnik token, you will need to have a Wordnik account, and then request an API key.

1. Sign up [here](https://wordnik.com/signup).
2. Request an API key. The token will take a few days to arrive. You can speed up the process by donating.
3. Add a record for Wordnik to your `.env` file:
```
SECRET_WORDNIK=<token goes here>
```

### Step 5.4: PONS

> Logos uses PONS for its word services in several languages. The free plan comes with a limit of 1000 reference queries per month.

To get a PONS token, you will need to have a PONS account, and then submit an API registration form.

1. Sign up [here](https://account.pons.com/en/public/signup)
2. Submit an API registration form [here]().
3. Add a record for PONS to your `.env` file:
```
SECRET_PONS=<token goes here>
```

### That's all!

Hopefully, once you've reached this section, you would have a fully configured instance of Logos to run for yourself.

If that's the case, congratulations, and welcome to the world of Logos!

If not, and you've encountered difficulty along the way, [join the Logos support server to get assistance](https://discord.gg/TWdAjkTfah).
