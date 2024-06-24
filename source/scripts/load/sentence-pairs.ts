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

// Sentence index. The key is '<locale>:index', the value is an array of sentence IDs for the given locale.
//
// Example:
// ron:index | [1, 2, 3, 4, 5]
const indexes: Record<string, number[]> = {};
for (const [locale, contents] of contentsAll) {
	indexes[locale] = [];

	const segmenter = new Intl.Segmenter(locale, { granularity: "word" });

	// Sentence entry. The key is '<locale>:<sentence id>', the value is a stringified JSON with contents
	// [sentence ID, sentence, translation ID, translation].
	//
	// Example:
	// ron:1 | "[1,"Acesta este o propoziție în română.",2,"This is a sentence in Romanian."]"
	const sentences: Record<string, string> = {};
	let sentenceCount = 0;
	// Lemma index. The key is '<locale>:<sentence>', the value is an array of sentence IDs featuring the lemma in the
	// given language.
	//
	// Example:
	// ron::cuvânt | [1, 2, 3, 4, 5]
	const lemmas: Record<string, number[]> = {};
	let lemmaCount = 0;
	for (const line of contents.split("\n")) {
		const record = line.split("\t") as [
			sentenceId: string,
			sentence: string,
			translationId: string,
			translation: string,
		];

		for (const data of segmenter.segment(record[1])) {
			const key = constants.keys.redis.lemmaIndex({ locale, lemma: data.segment });

			if (!(key in lemmas)) {
				lemmas[key] = [];
			}

			lemmas[key]!.push(Number(record));
			lemmaCount += 1;
		}

		sentences[constants.keys.redis.sentencePair({ locale, sentenceId: record[0] })] = JSON.stringify(record);
		sentenceCount += 1;
		indexes[locale]!.push(Number(record[0]));
	}

	// Remove the empty elements created by trying to parse the last, empty line in the files.
	delete sentences[constants.keys.redis.sentencePair({ locale, sentenceId: "" })];
	delete lemmas[constants.keys.redis.lemmaIndex({ locale, lemma: "" })];
	indexes[locale]!.pop();

	await client.mset(sentences);

	winston.info(`Wrote ${sentenceCount} sentences for ${locale}.`);

	await client.mset(lemmas);

	winston.info(`Wrote ${lemmaCount} lemmas for ${locale}.`);
}

const pipeline = client.pipeline();
for (const locale of locales) {
	pipeline.sadd(constants.keys.redis.sentencePairIndex({ locale }), indexes[locale]!);
}
await pipeline.exec();

winston.info("Wrote indexes.");

await client.quit();

process.exit(0);
