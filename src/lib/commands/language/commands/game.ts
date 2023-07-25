import constants from "../../../../constants.js";
import defaults from "../../../../defaults.js";
import { Client, localise } from "../../../client.js";
import {
	acknowledge,
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	encodeId,
	postponeReply,
	reply,
} from "../../../interactions.js";
import { CommandTemplate } from "../../command.js";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "game",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	handle: handleStartGame,
};

type WordButtonID = [index: string];

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function handleStartGame([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetch(client, "id", guildId.toString());
	if (guildDocument === undefined) {
		return;
	}

	const sentencePairs = client.features.sentencePairs.get(guildDocument.data.language);
	if (sentencePairs === undefined || sentencePairs.length === 0) {
		const strings = {
			title: localise(client, "game.strings.noSentencesAvailable.title", interaction.locale)(),
			description: localise(client, "game.strings.noSentencesAvailable.description", interaction.locale)(),
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
					console.warn("Failed to delete no results for word message.");
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
			if (isNaN(index)) {
				return;
			}

			if (index < 0 || index > sentenceSelection.choices.length - 1) {
				return;
			}

			const choice = sentenceSelection.choices.at(index);
			const isCorrect = choice === sentenceSelection.word;

			embedColor = isCorrect ? constants.colors.lightGreen : constants.colors.red;

			sentenceSelection = createSentenceSelection(sentencePairs);

			editReply(
				[client, bot],
				interaction,
				getGameView(client, customId, sentenceSelection, embedColor, interaction.locale),
			);
		},
	});

	sentenceSelection = createSentenceSelection(sentencePairs);

	editReply(
		[client, bot],
		interaction,
		getGameView(client, customId, sentenceSelection, embedColor, interaction.locale),
	);
}

function getGameView(
	client: Client,
	customId: string,
	sentenceSelection: SentenceSelection,
	embedColor: number,
	locale: string | undefined,
): Discord.InteractionCallbackData {
	const strings = {
		sentence: localise(client, "game.strings.sentence", locale)(),
		translation: localise(client, "game.strings.translation", locale)(),
	};

	return {
		embeds: [
			{
				color: embedColor,
				fields: [
					{
						name: strings.sentence,
						value: sentenceSelection.pair.sentence,
					},
					{
						name: strings.translation,
						value: sentenceSelection.pair.translation,
					},
				],
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
	/** The source sentence. */
	sentence: string;

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
	function shuffle<T>(array: T[]): T[] {
		const shuffled = Array.from(array);

		for (const index of Array(array.length - 1).keys()) {
			const random = Math.floor(Math.random() * (index + 1));
			const [a, b] = [shuffled.at(index), shuffled.at(random)];
			if (a === undefined || b === undefined) {
				throw "StateError: Failed to swap elements during sentence selection.";
			}

			[shuffled[index], shuffled[random]] = [b, a];
		}

		return shuffled;
	}

	function random(max: number): number {
		return Math.floor(Math.random() * max);
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

	words[wordIndex] = "\\_".repeat(word.split("").length);
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
