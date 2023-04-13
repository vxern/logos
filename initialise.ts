import * as dotenv from 'std/dotenv/mod.ts';
import { Bot, Locales } from 'discordeno';
import * as Sentry from 'sentry';
import {
	getSupportedLanguages,
	loadDictionaryAdapters,
	loadSentencePairs,
} from 'logos/src/commands/language/module.ts';
import { Client, initialiseClient } from 'logos/src/client.ts';
import { capitalise } from 'logos/formatting.ts';
import { getLanguageByLocale, Language, supportedLanguages } from 'logos/types.ts';

async function readDotEnvFile(fileUri: string, isTemplate = false): Promise<dotenv.DotenvConfig | undefined> {
	const kind = isTemplate ? 'environment template' : 'environment';

	let contents: string;
	try {
		contents = await Deno.readTextFile(fileUri);
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) {
			console.error(`Missing ${kind} file.`);
			if (!isTemplate) {
				return undefined;
			}
		}

		console.error(`Unknown error while reading ${kind} file: ${error}`);

		Deno.exit(1);
	}

	try {
		return dotenv.parse(contents);
	} catch (error) {
		console.error(`Unknown error while parsing ${kind} file: ${error}`);
		Deno.exit(1);
	}
}

function readEnvironment({
	envConfiguration,
	templateEnvConfiguration,
}: {
	envConfiguration: dotenv.DotenvConfig | undefined;
	templateEnvConfiguration: dotenv.DotenvConfig;
}): void {
	const requiredKeys = Object.keys(templateEnvConfiguration);

	const presentKeys = Object.keys(envConfiguration !== undefined ? envConfiguration : Deno.env.toObject());

	const missingKeys = requiredKeys.filter((requiredKey) => !presentKeys.includes(requiredKey));
	if (missingKeys.length !== 0) {
		console.error(`Missing one or more required environment variables: ${missingKeys.join(', ')}`);
		Deno.exit(1);
	}

	if (envConfiguration === undefined) return;

	for (const [key, value] of Object.entries(envConfiguration) as [key: string, value: string][]) {
		Deno.env.set(key, value);
	}
}

const defaultSoftwareNotice = 'Deno';

async function readVersion(): Promise<string> {
	const decoder = new TextDecoder();

	const command = Deno.run({
		cmd: ['git', 'tag', '--sort=-committerdate', '--list', 'v*'],
		stdout: 'piped',
		stderr: 'null',
	});
	const [status, contents] = await Promise.all([command.status(), command.output()]);
	if (!status.success) {
		const command = Deno.run({ cmd: ['deno', '--version'], stdout: 'piped', stderr: 'null' });
		const [status, contents] = await Promise.all([command.status(), command.output()]);
		if (!status.success) return defaultSoftwareNotice;

		const denoVersion = decoder.decode(contents).split(' ').at(1);
		return `Deno v${denoVersion}` ?? defaultSoftwareNotice;
	}

	const programVersion = decoder.decode(contents).split('\n').at(0);
	return programVersion ?? defaultSoftwareNotice;
}

async function readLocalisations(directoryUri: string): Promise<Map<string, Map<Language, string>>> {
	const decoder = new TextDecoder();

	const subdirectories: string[] = [];
	for await (const entry of Deno.readDir(directoryUri)) {
		if (!entry.isDirectory) continue;

		subdirectories.push(`${directoryUri}/${entry.name}`);
	}

	const localisationFiles: [Language, string][] = [];
	for (const subdirectory of subdirectories) {
		for await (const localeEntry of Deno.readDir(subdirectory)) {
			if (!localeEntry.isFile) continue;

			const [locale, _] = localeEntry.name.split('.') as [Locales, string];
			const language = getLanguageByLocale(locale);
			if (language === undefined) continue;

			localisationFiles.push([language, `${subdirectory}/${localeEntry.name}`]);
		}
	}

	const localisations = new Map<string, Map<Language, string>>();
	for (const [language, path] of localisationFiles) {
		const strings = await Deno.readFile(path)
			.then((contents) => decoder.decode(contents))
			.then((object) => JSON.parse(object) as Record<string, string>);

		for (const [key, value] of Object.entries(strings)) {
			if (!localisations.has(key)) {
				localisations.set(key, new Map());
			}
			localisations.get(key)!.set(language, value);
		}
	}

	return localisations;
}

/**
 * @returns An array of tuples where the first element is a language and the second
 * element is the contents of its sentence file.
 */
async function readSentenceFiles(directoryUri: string): Promise<[Language, string][]> {
	const files: Deno.DirEntry[] = [];
	for await (const entry of Deno.readDir(directoryUri)) {
		if (!entry.isFile) continue;

		files.push(entry);
	}

	const results: Promise<[Language, string]>[] = [];
	for (const file of files) {
		const languageName = capitalise(file.name.split('.').at(0)!);

		if (!Array.from<string>(supportedLanguages).includes(languageName)) {
			console.warn(
				`File '${file.name}' contains sentences for a language '${languageName}' not supported by the application. Skipping...`,
			);
			continue;
		}

		const language = languageName as Language;
		results.push(Deno.readTextFile(`${directoryUri}/${file.name}`).then((contents) => [language, contents]));
	}

	return Promise.all(results);
}

async function initialise(): Promise<[Client, Bot]> {
	const [envConfiguration, templateEnvConfiguration] = await Promise.all([
		readDotEnvFile('.env'),
		readDotEnvFile('.env.example', true),
	]);

	readEnvironment({ envConfiguration, templateEnvConfiguration: templateEnvConfiguration! });

	Sentry.init({ dsn: Deno.env.get('SENTRY_SECRET'), environment: Deno.env.get('ENVIRONMENT') });

	const [version, supportedTranslationLanguages, sentenceFiles] = await Promise.all([
		readVersion(),
		getSupportedLanguages(),
		readSentenceFiles('./assets/sentences'),
	]);

	const localisations = await readLocalisations('./assets/localisations');

	return initialiseClient({ version, supportedTranslationLanguages }, localisations, {
		dictionaryAdapters: loadDictionaryAdapters(),
		sentencePairs: loadSentencePairs(sentenceFiles),
		rateLimiting: new Map(),
	});
}

export { initialise };
