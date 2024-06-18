import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as stream from "node:stream";
import constants from "logos:constants/constants";
import { type Locale, getLocaleByLearningLanguage, isLearningLanguage } from "logos:constants/languages";
import { locales } from "logos:constants/languages/localisation";
import { capitalise } from "logos:core/formatting";
import eventStream from "event-stream";
import Redis from "ioredis";
import winston from "winston";

const RECORD_DELIMETER = "	";
const MAX_BUFFER_SIZE = 1024 * 128;

const client = new Redis();

interface SentencePairFile {
	path: string;
	locale: Locale;
}
async function getFiles(directoryPath: string): Promise<SentencePairFile[]> {
	winston.info(`Looking for files in ${directoryPath}...`);

	const files: SentencePairFile[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const filePath = `${directoryPath}/${entryPath}`;
		if ((await fs.stat(filePath)).isDirectory()) {
			winston.info(`Found directory ${filePath}. Discounting...`);
			continue;
		}

		const [_, fileName] = /^(.+)\.tsv$/.exec(entryPath) ?? [];
		if (fileName === undefined) {
			winston.warn(`File '${entryPath}' has an invalid format. Discounting...`);
			continue;
		}

		const language = fileName.split("-").map(capitalise).join("/");
		if (!isLearningLanguage(language)) {
			winston.warn(`Found file for language '${language}' not supported by the application. Discounting...`);
			continue;
		}

		const locale = getLocaleByLearningLanguage(language);

		files.push({ path: filePath, locale });
	}

	winston.info(`Found ${files.length} sentence pair files in ${directoryPath}.`);

	return files;
}

type SentencePairRecord = [
	sentenceId: string | number,
	sentence: string,
	translationId: string | number,
	translation: string,
];
type RecordWithLanguage = [locale: Locale, record: SentencePairRecord];
async function subscribeToReadStream(readStream: stream.Writable, file: SentencePairFile): Promise<void> {
	const { promise, resolve, reject } = Promise.withResolvers<void>();

	const stream = fsSync.createReadStream(file.path, { encoding: "utf-8", autoClose: true, emitClose: true });

	stream.once("end", () => {
		winston.info(`Finished reading sentence pairs for ${file.locale}.`);
		stream.close();
		resolve();
	});

	stream.once("error", () => reject());

	stream.pipe(eventStream.split()).pipe(
		eventStream.map((line: string) => {
			const record = line.split(RECORD_DELIMETER) as SentencePairRecord;
			record[0] = Number.parseInt(record[0] as string);
			record[2] = Number.parseInt(record[2] as string);

			line.length > 0 && readStream.write([file.locale, record] satisfies RecordWithLanguage);
		}),
	);

	return promise;
}

const indexes: Record<Locale, number[]> = Object.fromEntries(
	locales.map<[Locale, number[]]>((locale) => [locale, []]),
) as Record<Locale, number[]>;

interface EntryBuffer {
	entries: Record<string, string>;
	size: number;
	add(record: RecordWithLanguage): void;
	reset(): void;
	flush(): void;
}
const entryBuffer: EntryBuffer = {
	entries: {},
	size: 0,
	add(record: RecordWithLanguage) {
		this.entries[`${record[0]}:${record[1][0]}`] = JSON.stringify(record[1]);
		this.size += 1;

		indexes[record[0]].push(record[1][0] as number);

		this.size === MAX_BUFFER_SIZE && this.flush();
	},
	reset() {
		this.entries = {};
		this.size = 0;
	},
	flush() {
		winston.info(`Flushing buffer (${this.size} entries)...`);
		client.mset(this.entries).then();
		this.reset();
	},
};

const readStream = new stream.Writable({
	objectMode: true,
	write: (record: RecordWithLanguage, _, next) => {
		entryBuffer.add(record);
		next();
	},
	final() {
		entryBuffer.flush();
	},
});

const promises = [];
for (const file of await getFiles(constants.SENTENCE_PAIRS_DIRECTORY)) {
	promises.push(subscribeToReadStream(readStream, file));
}
await Promise.all(promises);
readStream.end();

// Remove the NaN element created by trying to parse the last, empty line.
{
	const pipeline = client.pipeline();
	for (const locale of locales) {
		indexes[locale].pop();
		pipeline.del(`${locale}:NaN`);
	}
	await pipeline.exec();
}

// Save new entries to the indexes.
{
	const pipeline = client.pipeline();
	for (const locale of locales) {
		pipeline.sadd(`${locale}:index`, indexes[locale]);
	}
	await pipeline.exec();
}

await client.quit();

process.exit(0);
