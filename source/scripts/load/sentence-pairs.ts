import constants from "logos:constants/constants";
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

for (const [locale, contents] of contentsAll) {
	const segmenter = new Intl.Segmenter(locale, { granularity: "word" });

	// Sentence index. The value is an array of sentence IDs for the given locale.
	//
	// Example:
	// [1, 2, 3, 4, 5]
	const sentencePairIndex: number[] = [];
	// Sentence entry. The value is a stringified JSON with contents [sentence ID, sentence, translation ID,
	// translation].
	//
	// Example:
	// [1, "Acesta este o propoziție în română.", 2, "This is a sentence in Romanian."]
	const sentencePairs: Record<string, string> = {};
	// Lemma use index. The value is an array of sentence IDs that feature the lemma in the given language.
	//
	// Example:
	// [1, 2, 3, 4, 5]
	const lemmaUseIndexes: Record<string, number[]> = {};
	// Lemma form index. The value is an array of different forms the lemma is found under.
	//
	// Example:
	// ["polish", "Polish", "POLISH"]
	const lemmaFormIndexes: Record<string, string[]> = {};
	for (const line of contents.split("\n")) {
		const record = line.split("\t") as [
			sentenceId: string,
			sentence: string,
			translationId: string,
			translation: string,
		];

		const sentenceId = Number(record[0]);

		for (const data of segmenter.segment(record[1])) {
			const lemmaUseKey = constants.keys.redis.lemmaUseIndex({ locale, lemma: data.segment });
			(lemmaUseIndexes[lemmaUseKey] ??= []).push(sentenceId);

			const lemmaFormKey = constants.keys.redis.lemmaFormIndex({ locale, lemma: data.segment.toLowerCase() });
			(lemmaFormIndexes[lemmaFormKey] ??= []).push(data.segment);
		}

		sentencePairs[constants.keys.redis.sentencePair({ locale, sentenceId })] = JSON.stringify(record);
		sentencePairIndex.push(sentenceId);
	}

	// Remove the empty elements created by trying to parse the last, empty line in the files.
	sentencePairIndex.pop();
	delete sentencePairs[constants.keys.redis.sentencePair({ locale, sentenceId: "" })];
	delete lemmaUseIndexes[constants.keys.redis.lemmaUseIndex({ locale, lemma: "" })];
	delete lemmaFormIndexes[constants.keys.redis.lemmaFormIndex({ locale, lemma: "" })];

	await client.sadd(constants.keys.redis.sentencePairIndex({ locale }), sentencePairIndex);

	winston.info(`Wrote sentence pair index for ${locale}.`);

	await client.mset(sentencePairs);

	winston.info(`Wrote sentence pairs for ${locale}.`);

	{
		const pipeline = client.pipeline();
		for (const [key, sentenceIds] of Object.entries(lemmaUseIndexes)) {
			pipeline.sadd(key, sentenceIds);
		}
		await pipeline.exec();

		winston.info(`Wrote lemma index for ${locale}.`);
	}

	{
		const pipeline = client.pipeline();
		for (const [key, sentenceIds] of Object.entries(lemmaFormIndexes)) {
			pipeline.sadd(key, sentenceIds);
		}
		await pipeline.exec();

		winston.info(`Wrote lemma forms for ${locale}.`);
	}
}

await client.quit();

process.exit(0);
