import constants from "logos:constants/constants";
import { locales } from "logos:constants/languages/localisation";
import Redis from "ioredis";
import winston from "winston";

winston.info(`Looking for files in ${constants.SENTENCE_PAIRS_DIRECTORY}...`);

const files = await Array.fromAsync(new Bun.Glob("*.tsv").scan(constants.SENTENCE_PAIRS_DIRECTORY)).then((filenames) =>
	filenames.map((filename) => Bun.file(`${constants.SENTENCE_PAIRS_DIRECTORY}/${filename}`)),
);

for (const file of files) {
	winston.info(`Located sentence file at ${file.name}.`);
}

winston.info(`Located ${files.length} sentence files in total in ${constants.SENTENCE_PAIRS_DIRECTORY}.`);

const promises: Promise<[locale: string, contents: string]>[] = [];
for (const file of files) {
	const locale = file.name!.split("/").at(-1)!.split(".").at(0)!;

	const promise = Bun.readableStreamToText(file.stream());
	promises.push(promise.then((contents) => [locale, contents]));
}

const contentsAll = await Promise.all(promises);

const client = new Redis();

const indexes: Record<string, number[]> = {};
for (const [locale, contents] of contentsAll) {
	indexes[locale] = [];

	const entries: Record<string, string> = {};
	for (const line of contents.split("\n")) {
		const record = line.split("\t") as [
			sentenceId: string,
			sentence: string,
			translationId: string,
			translation: string,
		];

		entries[`${locale}:${record[0]}`] = JSON.stringify(record[1]);
		indexes[locale]!.push(Number(record[0]));
	}

	// Remove the empty elements created by trying to parse the last, empty line in the files.
	delete entries[`${locale}:`];
	indexes[locale]!.pop();

	await client.mset(entries);

	winston.info(`Wrote ${indexes[locale]!.length} sentences for ${locale}...`);
}

// Save new entries to the indexes.
{
	const pipeline = client.pipeline();
	for (const locale of locales) {
		winston.info(`Writing index for ${locale}...`);
		pipeline.sadd(`${locale}:index`, indexes[locale]!);
	}
	await pipeline.exec();
}

await client.quit();

process.exit(0);
