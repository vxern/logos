import * as dotenv from 'std/dotenv/mod.ts';
import { Sentry } from './deps.ts';
import { initialiseClient } from './src/client.ts';
import { getSupportedLanguages } from './src/commands/language/module.ts';

const envFileName = '.env';
const envTemplateFileName = `${envFileName}.example`;

async function parseDotEnvFile(fileName: string, template = false): Promise<dotenv.DotenvConfig> {
	const kind = template ? 'environment template' : 'environment';

	let contents: string;
	try {
		contents = await Deno.readTextFile(fileName);
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			console.error(`Missing ${kind} file.`);
		} else {
			console.error(`Unknown error while reading ${kind} file: ${error}`);
		}

		Deno.exit(1);
	}

	try {
		return dotenv.parse(contents);
	} catch (error) {
		console.error(`Unknown error while parsing ${kind} file.`);
		Deno.exit(1);
	}
}

async function readDotEnvFile(): Promise<void> {
	const env = await parseDotEnvFile(envFileName);

	const requiredKeys = Object.keys(await parseDotEnvFile(envTemplateFileName));
	const presentKeys = Object.keys(env);

	const missingKeys = requiredKeys.filter((requiredKey) => !presentKeys.includes(requiredKey));
	if (missingKeys.length !== 0) {
		console.error(`Missing one or more required environment variables: ${missingKeys.join(', ')}`);
		Deno.exit(1);
	}

	for (const [key, value] of <[string, string][]> Object.entries(env)) {
		Deno.env.set(key, value);
	}
}

await readDotEnvFile();

async function readVersion(): Promise<string> {
	const version = new TextDecoder().decode(
		await Deno.run({
			cmd: ['git', 'tag', '--sort=-committerdate', '--list', 'v*'],
			stdout: 'piped',
		}).output(),
	).split('\n').at(0);

	return version ?? 'Deno';
}

Sentry.init({ dsn: Deno.env.get('SENTRY_SECRET'), environment: Deno.env.get('ENVIRONMENT') });

const version = await readVersion() ?? 'Deno';
const supportedTranslationLanguages = await getSupportedLanguages();

initialiseClient({
	version,
	supportedTranslationLanguages,
});
