import { getLocaleByLearningLanguage, isLocalisationLanguage } from "logos:constants/languages.ts";
import { shuffle } from "ioredis/built/utils";
import type { Client } from "logos/client.ts";
import { autocompleteLanguage } from "logos/commands/fragments/autocomplete/language.ts";
import type { SentencePair } from "logos/stores/volatile.ts";

async function handleFindInContextAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { language: string | undefined }>,
): Promise<void> {
	await autocompleteLanguage(client, interaction);
}

async function handleFindInContext(
	client: Client,
	interaction: Logos.Interaction<any, { phrase: string; language: string | undefined }>,
): Promise<void> {
	if (interaction.parameters.language !== undefined && !isLocalisationLanguage(interaction.parameters.language)) {
		const strings = constants.contexts.invalidLanguage({ localise: client.localise, locale: interaction.locale });
		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.red,
				},
			],
		});
		return;
	}

	await client.postponeReply(interaction, { visible: interaction.parameters.show });

	const learningLanguage =
		interaction.parameters.language !== undefined ? interaction.parameters.language : interaction.learningLanguage;
	const learningLocale = getLocaleByLearningLanguage(learningLanguage);

	const segmenter = new Intl.Segmenter(learningLocale, { granularity: "word" });
	const lemmas = Array.from(segmenter.segment(interaction.parameters.phrase)).map((data) => data.segment);
	const sentencePairs = await client.volatile?.searchForLemmaUses({
		lemmas,
		learningLocale: learningLocale,
	});
	if (sentencePairs === undefined || sentencePairs.length === 0) {
		const strings = constants.contexts.noSentencesFound({
			localise: client.localise.bind(client),
			locale: interaction.displayLocale,
		});
		await client.warned(
			interaction,
			{
				title: strings.title,
				description: strings.description,
			},
			{ autoDelete: true },
		);

		return;
	}

	let sentencePairSelection: SentencePair[];
	if (sentencePairs.length <= constants.SENTENCE_PAIRS_TO_SHOW) {
		sentencePairSelection = sentencePairs;
	} else {
		sentencePairSelection = shuffle(sentencePairs).slice(0, constants.SENTENCE_PAIRS_TO_SHOW);
	}

	// TODO(vxern): Get lemmas from `searchForLemmaUses()` to highlight words regardless of original capitalisation.
	const lemmaPatterns = lemmas.map<[lemma: string, pattern: RegExp]>((lemma) => [
		lemma,
		constants.patterns.wholeWord(lemma, { caseSensitive: true }),
	]);

	const strings = constants.contexts.phraseInContext({
		localise: client.localise.bind(client),
		locale: interaction.displayLocale,
	});
	await client.noticed(interaction, {
		embeds: [
			{
				title: strings.title({ phrase: interaction.parameters.phrase }),
				fields: sentencePairSelection.map((sentencePair) => {
					let sentenceFormatted = sentencePair.sentence;
					for (const [lemma, pattern] of lemmaPatterns) {
						sentenceFormatted = sentenceFormatted.replaceAll(pattern, `__${lemma}__`);
					}

					return {
						name: sentenceFormatted,
						value: sentencePair.translation,
					};
				}),
			},
		],
		components: interaction.parameters.show
			? undefined
			: [
					{
						type: Discord.MessageComponentTypes.ActionRow,
						components: [client.interactionRepetitionService.getShowButton(interaction)],
					},
				],
	});
}

export { handleFindInContext, handleFindInContextAutocomplete };
