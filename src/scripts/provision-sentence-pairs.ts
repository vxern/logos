import * as fsSync from "fs";
import * as stream from "stream";
import eventStream from "event-stream";
import * as fs from "fs/promises";
import Redis from "ioredis";
import { Locale, getLocaleByLearningLanguage, isLearningLanguage } from "../constants/languages";
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

type SentencePairRecord = [sentenceId: string, sentence: string, translationId: string, translation: string];
type RecordWithLanguage = [locale: Locale, record: SentencePairRecord];
async function subscribeToReadStream(readStream: stream.Writable, file: SentencePairFile): Promise<void> {
	return new Promise((resolve, reject) =>
		fsSync
			.createReadStream(file.path, { encoding: "utf-8", autoClose: true, emitClose: true })
			.once("close", () => {
				console.info(`Finished reading sentence pairs for ${file.locale}.`);
				resolve();
			})
			.once("error", () => reject())
			.pipe(eventStream.split())
			.pipe(
				eventStream.map((line: string) =>
					readStream.write([
						file.locale,
						line.split(RECORD_DELIMETER) as SentencePairRecord,
					] satisfies RecordWithLanguage),
				),
			),
	);
}

console.time("provision-sentence-pairs");

interface EntryBuffer {
	entries: Record<string, string>;
	size: number;
	add(key: string, value: string): void;
	reset(): void;
	flush(): Promise<void>;
}
const entryBuffer: EntryBuffer = {
	entries: {},
	size: 0,
	add(key, value) {
		this.entries[key] = value;
		this.size++;

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
	write: (data: RecordWithLanguage, _, next) => {
		entryBuffer.add(`${data[0]}:${data[1][0]}`, JSON.stringify(data[1]));
		next();
	},
	final() {
		entryBuffer.flush();
	},
});

const promises = [];
for (const file of await getFiles(defaults.SENTENCE_PAIRS_DIRECTORY)) {
	promises.push(subscribeToReadStream(readStream, file));
}
await Promise.all(promises);
readStream.end();

console.timeEnd("provision-sentence-pairs");

await client.quit();
