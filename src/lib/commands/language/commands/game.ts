import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import { Locale, getLocaleByLearningLanguage } from "../../../../constants/languages";
import licences from "../../../../constants/licences";
import defaults from "../../../../defaults";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import {
	acknowledge,
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	encodeId,
	postponeReply,
	reply,
} from "../../../interactions";
import { random } from "../../../utils";
import { CommandTemplate } from "../../command";
import { capitalise } from "../../../../formatting";

const command: CommandTemplate = {
	name: "game",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleStartGame,
};

const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });

type WordButtonID = [index: string];

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function handleStartGame([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;
	const learningLocale = getLocaleByLearningLanguage(interaction.learningLanguage);

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const sentencePairCount = await client.cache.database.scard(`${learningLocale}:index`);
	if (sentencePairCount === 0) {
		const strings = {
			title: localise(client, "game.strings.noSentencesAvailable.title", locale)(),
			description: localise(client, "game.strings.noSentencesAvailable.description", locale)(),
		};

		await reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});

		setTimeout(
			() =>
				deleteReply([client, bot], interaction).catch(() => {
					client.log.warn(`Failed to delete "no results for word" message.`);
				}),
			defaults.WARN_MESSAGE_DELETE_TIMEOUT,
		);

		return;
	}

	await postponeReply([client, bot], interaction);

	let sentenceSelection: SentenceSelection;
	let embedColor = constants.colors.blue;

	const customId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			const selectionCustomId = selection.data?.customId;
			if (selectionCustomId === undefined) {
				return;
			}

			const [_, id] = decodeId<WordButtonID>(selectionCustomId);
			if (id === undefined) {
				return;
			}

			const pick = sentenceSelection.allPicks.find((pick) => pick[0] === id);
			const isCorrect = pick === sentenceSelection.correctPick;

			embedColor = isCorrect ? constants.colors.lightGreen : constants.colors.red;

			sentenceSelection = await getSentenceSelection(client, learningLocale);

			editReply([client, bot], interaction, getGameView(client, customId, sentenceSelection, embedColor, { locale }));
		},
	});

	sentenceSelection = await getSentenceSelection(client, learningLocale);

	editReply([client, bot], interaction, getGameView(client, customId, sentenceSelection, embedColor, { locale }));
}

function getGameView(
	client: Client,
	customId: string,
	sentenceSelection: SentenceSelection,
	embedColor: number,
	{ locale }: { locale: Locale },
): Discord.InteractionCallbackData {
	const strings = {
		sentence: localise(client, "game.strings.sentence", locale)(),
		translation: localise(client, "game.strings.translation", locale)(),
		sourcedFrom: localise(client, "game.strings.sourcedFrom", locale)({ source: licences.dictionaries.tatoeba.name }),
	};

	const sentenceSource = constants.links.generateTatoebaSentenceLink(sentenceSelection.sentencePair.sentenceId);
	const translationSource = constants.links.generateTatoebaSentenceLink(sentenceSelection.sentencePair.translationId);

	const mask = constants.symbols.game.mask.repeat(sentenceSelection.correctPick[1].length);

	return {
		embeds: [
			{
				description: `${constants.symbols.link} [${strings.sentence}](${sentenceSource}) · [${strings.translation}](${translationSource})`,
				color: constants.colors.peach,
				footer: { text: strings.sourcedFrom },
			},
			{
				title: sentenceSelection.sentencePair.sentence.replaceAll(
					constants.patterns.wholeWord(sentenceSelection.correctPick[1]),
					mask,
				),
				footer: { text: sentenceSelection.sentencePair.translation },
				color: embedColor,
			},
		],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: sentenceSelection.allPicks.map((pick) => ({
					type: Discord.MessageComponentTypes.Button,
					style: Discord.ButtonStyles.Success,
					label: pick[1],
					customId: encodeId<WordButtonID>(customId, [pick[0]]),
				})) as [Discord.ButtonComponent],
			},
		],
	};
}

/** Represents a pair of a sentence and its translation. */
interface SentencePair {
	sentenceId: number;

	/** The source sentence. */
	sentence: string;

	translationId: number;

	/** The translation of the sentence. */
	translation: string;
}

async function getRandomIds(client: Client, locale: Locale): Promise<string[]> {
	const pipeline = client.cache.database.pipeline();
	for (const _ of Array(defaults.GAME_WORD_SELECTION).keys()) {
		pipeline.srandmember(`${locale}:index`);
	}

	const results = (await pipeline.exec()) ?? undefined;
	if (results === undefined) {
		throw "StateError: Failed to get random indexes for sentence pairs.";
	}

	const indexes = results.map((result) => {
		const [error, index] = result as [Error | null, string | null];
		if ((error ?? undefined) !== undefined || (index ?? undefined) === undefined) {
			throw `StateError: Failed to get random index for sentence pair: ${index}`;
		}

		return index as string;
	});

	return indexes;
}

async function getSentencePairById(client: Client, locale: Locale, id: string): Promise<SentencePair> {
	const pairRaw = await client.cache.database.get(`${locale}:${id}`).then((sentencePair) => sentencePair ?? undefined);
	if (pairRaw === undefined) {
		throw `StateError: Failed to get sentence pair for locale ${locale} and index ${id}.`;
	}

	const [sentenceId, sentence, translationId, translation] = JSON.parse(pairRaw) as [number, string, number, string];
	return { sentenceId, sentence, translationId, translation };
}

async function getSentencePairsByIds(client: Client, locale: Locale, ids: string[]): Promise<SentencePair[]> {
	const promises: Promise<SentencePair>[] = [];
	for (const id of ids) {
		promises.push(getSentencePairById(client, locale, id));
	}

	const sentencePairs = await Promise.all(promises);
	return sentencePairs;
}

function getWords(...sentences: string[]): string[] {
	const wordsAll: string[] = [];

	for (const sentence of sentences) {
		const segmentsRaw = Array.from(wordSegmenter.segment(sentence));

		const segmentsProcessedSeparate: Intl.SegmentData[][] = [];
		let isCompound = false;

		for (const segment of segmentsRaw) {
			if (/[’'-]/.test(segment.segment)) {
				isCompound = true;
				segmentsProcessedSeparate.at(-1)?.push(segment);
				continue;
			}

			if (isCompound) {
				isCompound = false;
				segmentsProcessedSeparate.at(-1)?.push(segment);
				continue;
			}

			segmentsProcessedSeparate.push([segment]);
		}

		const segmentsProcessed = segmentsProcessedSeparate.map<{ segment: string; isWordLike: boolean }>((segments) => {
			let isWordLike = false;
			const segmentStrings: string[] = [];
			for (const segment of segments) {
				isWordLike ||= segment.isWordLike ?? false;
				segmentStrings.push(segment.segment);
			}

			return { segment: segmentStrings.join(""), isWordLike };
		});

		for (const segment of segmentsProcessed) {
			if (!segment.isWordLike) {
				continue;
			}

			if (/[0-9]/.test(segment.segment)) {
				continue;
			}

			wordsAll.push(segment.segment);
		}
	}

	return wordsAll;
}

// ! Mutates the original array.
function extractRandomWord(words: string[]): string {
	const word = words.splice(random(words.length), 1).at(0);
	if (word === undefined) {
		throw "StateError: Failed to extract random word.";
	}

	return word;
}

function camouflageDecoys(likeness: string, decoys: string[]): string[] {
	let results = [...decoys];

	const isUppercase = likeness.toUpperCase() === likeness;
	if (isUppercase) {
		results = results.map((result) => result.toUpperCase());
	}

	const isLowercase = likeness.toLowerCase() === likeness;
	if (isLowercase) {
		results = results.map((result) => result.toLowerCase());
	}

	const isFirstCapitalised = capitalise(likeness) === likeness;
	if (isFirstCapitalised) {
		results = results.map((result) => capitalise(result));
	}

	return results;
}

type Selection = [id: string, word: string];
interface SentenceSelection {
	correctPick: Selection;
	allPicks: Selection[];
	sentencePair: SentencePair;
}

async function getSentenceSelection(client: Client, locale: Locale): Promise<SentenceSelection> {
	// Pick random IDs of sentences to take words from.
	const ids = await getRandomIds(client, locale);
	const sentencePairs = await getSentencePairsByIds(client, locale, ids);

	const mainSentencePair = sentencePairs.splice(random(sentencePairs.length), 1).at(0);
	if (mainSentencePair === undefined) {
		throw "StateError: Failed to select main sentence pair.";
	}
	const mainId = ids
		.splice(
			ids.findIndex((id) => parseInt(id) === mainSentencePair.sentenceId),
			1,
		)
		.at(0);
	if (mainId === undefined) {
		throw "StateError: Failed to select main sentence pair ID.";
	}

	const mainSentenceWords = Array.from(new Set(getWords(mainSentencePair.sentence)));
	const mainWord = extractRandomWord(mainSentenceWords);

	const words = Array.from(new Set(getWords(...sentencePairs.map((pair) => pair.sentence))))
		.map((word) => ({ word, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ word }) => word);
	if (words.length < defaults.GAME_WORD_SELECTION - 1) {
		for (const _ of Array(defaults.GAME_WORD_SELECTION - 1 - words.length).keys()) {
			words.push("?");
		}
	}

	const decoysExposed: string[] = [];
	while (decoysExposed.length < defaults.GAME_WORD_SELECTION - 1) {
		const word = extractRandomWord(words);
		decoysExposed.push(word);
	}

	const decoys = camouflageDecoys(mainWord, decoysExposed);

	const correctPick: Selection = [mainId, mainWord];
	const allPicksRaw: Selection[] = [correctPick];
	for (const index of Array(ids.length).keys()) {
		const [id, word] = [ids[index], decoys[index]];
		if (id === undefined || word === undefined) {
			throw "StateError: Failed to create pick.";
		}

		allPicksRaw.push([id, word]);
	}
	const allPicks = allPicksRaw
		.map((pick) => ({ pick, sort: Math.random() }))
		.sort((a, b) => a.sort - b.sort)
		.map(({ pick }) => pick);

	return { correctPick, allPicks, sentencePair: mainSentencePair };
}

export default command;
