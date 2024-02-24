import * as fsSync from "fs";
import * as stream from "stream";
import eventStream from "event-stream";
import * as fs from "fs/promises";
import Redis from "ioredis";
import { Locale, getLocaleByLearningLanguage, isLearningLanguage, locales } from "../constants/languages";
import defaults from "../defaults";
import { capitalise } from "../formatting";

const RECORD_DELIMETER = "	";
const MAX_BUFFER_SIZE = 1024 * 128;

const client = new Redis();

interface SentencePairFile {
	path: string;
	locale: Locale;
}
async function getFiles(directoryPath: string): Promise<SentencePairFile[]> {
	console.info(`Looking for files in ${directoryPath}...`);

	const files: SentencePairFile[] = [];
	for (const entryPath of await fs.readdir(directoryPath)) {
		const filePath = `${directoryPath}/${entryPath}`;
		if ((await fs.stat(filePath)).isDirectory()) {
			console.info(`Found directory ${filePath}. Discounting...`);
			continue;
		}

		const [_, fileName] = /^(.+)\.tsv$/.exec(entryPath) ?? [];
		if (fileName === undefined) {
			console.warn(`File '${entryPath}' has an invalid format. Discounting...`);
			continue;
		}

		const language = fileName.split("-").map(capitalise).join("/");
		if (!isLearningLanguage(language)) {
			console.warn(`Found file for language '${language}' not supported by the application. Discounting...`);
			continue;
		}

		const locale = getLocaleByLearningLanguage(language);

		files.push({ path: filePath, locale });
	}

	console.info(`Found ${files.length} sentence pair files in ${directoryPath}.`);

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

	fsSync
		.createReadStream(file.path, { encoding: "utf-8", autoClose: true, emitClose: true })
		.once("close", () => {
			console.info(`Finished reading sentence pairs for ${file.locale}.`);
			resolve();
		})
		.once("error", () => reject())
		.pipe(eventStream.split())
		.pipe(
			eventStream.map((line: string) => {
				const record = line.split(RECORD_DELIMETER) as SentencePairRecord;
				record[0] = parseInt(record[0] as string);
				record[2] = parseInt(record[2] as string);

				line.length !== 0 && readStream.write([file.locale, record] satisfies RecordWithLanguage);
			}),
		);

	return promise;
}

console.time("provision-sentence-pairs");

const indexes: Record<Locale, number[]> = Object.fromEntries(
	locales.map<[Locale, number[]]>((locale) => [locale, []]),
) as Record<Locale, number[]>;

interface EntryBuffer {
	entries: Record<string, string>;
	size: number;
	add(record: RecordWithLanguage): void;
	reset(): void;
	flush(): Promise<void>;
}
const entryBuffer: EntryBuffer = {
	entries: {},
	size: 0,
	add(record: RecordWithLanguage) {
		this.entries[`${record[0]}:${record[1][0]}`] = JSON.stringify(record[1]);
		this.size++;

		indexes[record[0]].push(record[1][0] as number);

		this.size === MAX_BUFFER_SIZE && this.flush();
	},
	reset() {
		this.entries = {};
		this.size = 0;
	},
	async flush() {
		console.info(`Flushing buffer (${this.size} entries)...`);
		client.mset(this.entries);
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

function addPolyfills(): void {
	Promise.withResolvers = <T>() => {
		let resolve!: (value: T) => void;
		let reject!: () => void;

		const promise = new Promise<T>((resolve_, reject_) => {
			resolve = resolve_;
			reject = reject_;
		});

		return { promise, resolve, reject };
	};
}

addPolyfills();

const promises = [];
for (const file of await getFiles(defaults.SENTENCE_PAIRS_DIRECTORY)) {
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

// Save new entries to the index.
{
	const pipeline = client.pipeline();
	for (const locale of locales) {
		pipeline.sadd(`${locale}:index`, indexes[locale]);
	}
	await pipeline.exec();
}

console.timeEnd("provision-sentence-pairs");

await client.quit();
