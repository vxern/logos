import * as fsSync from "fs";
import * as stream from "stream";
import eventStream from "event-stream";
import * as fs from "fs/promises";
import Redis from "ioredis";
import { LearningLanguage, LocalisationLanguage, isLearningLanguage } from "../constants/languages";
import defaults from "../defaults";
import { capitalise } from "../formatting";

const DELIMITER = "	";

interface SentencePairFile {
	path: string;
	language: LocalisationLanguage;
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

		files.push({ path: filePath, language });
	}

	console.info(`Found ${files.length} sentence pair files in ${directoryPath}.`);

	return files;
}

type SentencePairRecord = [sentenceId: string, sentence: string, translationId: string, translation: string];
type RecordWithLanguage = [language: LearningLanguage, record: SentencePairRecord];

async function subscribeToReadStream(readStream: stream.Writable, file: SentencePairFile): Promise<void> {
	return new Promise((resolve, reject) =>
		fsSync
			.createReadStream(file.path, { encoding: "utf-8", autoClose: true, emitClose: true })
			.once("close", () => {
				console.info(`Finished reading sentence pairs for ${file.language}.`);
				resolve();
			})
			.once("error", () => reject())
			.pipe(eventStream.split())
			.pipe(eventStream.map((line: string) => readStream.write([file.language, line.split(DELIMITER)]))),
	);
}

const client = new Redis();

console.time("provision-sentence-pairs");

const writeStream = new stream.Writable({
	objectMode: true,
	write: async (data: Record<string, string>, _, next) => {
		await client.mset(data);
		keyCount = 0;
		next();
	},
});

let writeObject: Record<string, string> = {};
let keyCount = 0;
const readStream = new stream.Writable({
	objectMode: true,
	write: (data: RecordWithLanguage, _, next) => {
		writeObject[`${data[0]}:${data[1][0]}`] = JSON.stringify(data[1]);
		keyCount++;

		if (keyCount === 102400) {
			writeStream.write(writeObject);
			writeObject = {};
			keyCount = 0;
		}

		next();
	},
	final() {
		writeStream.write(writeObject);
		writeStream.end();
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
