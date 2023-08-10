import constants from "../../../../constants/constants";
import { Locale } from "../../../../constants/languages";
import licences from "../../../../constants/licences";
import defaults from "../../../../defaults";
import { code } from "../../../../formatting";
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
import { CommandTemplate } from "../../command";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "game",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleStartGame,
};

type WordButtonID = [index: string];

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function handleStartGame([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetch(client, "id", guildId.toString());
	if (guildDocument === undefined) {
		return;
	}

	const sentencePairs = client.features.sentencePairs.get(interaction.featureLanguage);
	if (sentencePairs === undefined || sentencePairs.length === 0) {
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
		onCollect: async (bot, selection) => {
			acknowledge([client, bot], selection);

			const selectionCustomId = selection.data?.customId;
			if (selectionCustomId === undefined) {
				return;
			}

			const [_, indexString] = decodeId<WordButtonID>(selectionCustomId);
			if (indexString === undefined) {
				return;
			}

			const index = Number(indexString);
			if (!Number.isSafeInteger(index)) {
				return;
			}

			if (index < 0 || index > sentenceSelection.choices.length - 1) {
				return;
			}

			const choice = sentenceSelection.choices.at(index);
			const isCorrect = choice === sentenceSelection.word;

			embedColor = isCorrect ? constants.colors.lightGreen : constants.colors.red;

			sentenceSelection = createSentenceSelection(sentencePairs);

			editReply([client, bot], interaction, getGameView(client, customId, sentenceSelection, embedColor, { locale }));
		},
	});

	sentenceSelection = createSentenceSelection(sentencePairs);

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

	const sentenceSource = constants.links.generateTatoebaSentenceLink(sentenceSelection.pair.sentenceId);
	const translationSource = constants.links.generateTatoebaSentenceLink(sentenceSelection.pair.translationId);

	return {
		embeds: [
			{
				description: `${constants.symbols.link} [${strings.sentence}](${sentenceSource}) · [${strings.translation}](${translationSource})`,
				color: constants.colors.peach,
				footer: { text: strings.sourcedFrom },
			},
			{
				title: sentenceSelection.pair.sentence,
				footer: { text: sentenceSelection.pair.translation },
				color: embedColor,
			},
		],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: sentenceSelection.choices.map((choice, index) => ({
					type: Discord.MessageComponentTypes.Button,
					style: Discord.ButtonStyles.Success,
					label: choice,
					customId: encodeId<WordButtonID>(customId, [index.toString()]),
				})) as [Discord.ButtonComponent],
			},
		],
	};
}

/** Represents a pair of a sentence and its translation. */
interface SentencePair {
	sentenceId: string;

	/** The source sentence. */
	sentence: string;

	translationId: string;

	/** The translation of the sentence. */
	translation: string;
}

/**
 * Represents a selection of a sentence to be used for the language game of
 * picking the correct word to fit into the blank space.
 */
interface SentenceSelection {
	/** The selected sentence pair. */
	pair: SentencePair;

	/** The word which fits into the blank in the word. */
	word: string;

	/** Words to choose from to fit into the blank. */
	choices: string[];
}

function createSentenceSelection(sentencePairs: SentencePair[]): SentenceSelection {
	function random(max: number): number {
		return Math.floor(Math.random() * max);
	}

	function shuffle<T>(array: T[]): T[] {
		const shuffled = Array.from(array);

		for (const index of Array(array.length - 1).keys()) {
			const randomIndex = random(index + 1);
			const [a, b] = [shuffled.at(index), shuffled.at(randomIndex)];
			if (a === undefined || b === undefined) {
				throw "StateError: Failed to swap elements during sentence selection.";
			}

			[shuffled[index], shuffled[randomIndex]] = [b, a];
		}

		return shuffled;
	}

	const [firstIndex, ...rest] = Array.from({ length: 4 }, () => random(sentencePairs.length));
	if (firstIndex === undefined) {
		throw "StateError: Failed to get the first index when creating a sentence selection.";
	}

	const pair = sentencePairs.at(firstIndex);
	if (pair === undefined) {
		throw `StateError: Failed to get the sentence pair at index ${firstIndex}.`;
	}

	const words = pair.sentence.split(" ");
	const wordIndex = random(words.length);
	const word = words.at(wordIndex);
	if (word === undefined) {
		throw `StateError: Failed to get the word at index ${word} from the sentence pair at index ${firstIndex}.`;
	}

	words[wordIndex] = code(" ".repeat(word.length + 1));
	pair.sentence = words.join(" ");

	const choices: string[] = [word];
	for (const index of rest) {
		const sentence = sentencePairs.at(index)?.sentence;
		if (sentence === undefined) {
			throw `StateError: Failed to get the sentence pair at index ${index}.`;
		}

		const words = sentence.split(" ");
		const wordIndex = random(words.length);
		const word = words.at(wordIndex);
		if (word === undefined) {
			throw `StateError: Failed to get the word at index ${wordIndex} from the sentence pair at index ${index}.`;
		}

		choices.push(word);
	}
	const shuffled = shuffle(choices);

	return { pair, word, choices: shuffled };
}

export default command;
export type { SentencePair };
