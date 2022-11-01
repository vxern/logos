import * as dotenv from 'std/dotenv/mod.ts';
import { Sentry } from './deps.ts';
import { initialiseClient } from './src/client.ts';
import { getSupportedLanguages } from './src/commands/language/module.ts';

const envFileName = '.env';
const envTemplateFileName = `${envFileName}.example`;

async function readDotEnvFile(fileName: string, template = false): Promise<dotenv.DotenvConfig | undefined> {
	const kind = template ? 'environment template' : 'environment';

	let contents: string;
	try {
		contents = await Deno.readTextFile(fileName);
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			console.error(`Missing ${kind} file.`);
			if (!template) {
				return undefined;
			}
		}

		console.error(`Unknown error while reading ${kind} file: ${error}`);

		Deno.exit(1);
	}

	try {
		return dotenv.parse(contents);
	} catch (error) {
		console.error(`Unknown error while parsing ${kind} file.`);
		Deno.exit(1);
	}
}

async function readEnvironment(): Promise<void> {
	const requiredKeys = Object.keys((await readDotEnvFile(envTemplateFileName, true))!);

	const env = await readDotEnvFile(envFileName);
	const presentKeys = Object.keys(env ? env : Deno.env.toObject());

	const missingKeys = requiredKeys.filter((requiredKey) => !presentKeys.includes(requiredKey));
	if (missingKeys.length !== 0) {
		console.error(`Missing one or more required environment variables: ${missingKeys.join(', ')}`);
		Deno.exit(1);
	}

	if (!env) return;

	for (const [key, value] of <[string, string][]> Object.entries(env)) {
		Deno.env.set(key, value);
	}
}

await readEnvironment();

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
