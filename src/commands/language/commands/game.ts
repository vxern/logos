import {
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	editOriginalInteractionResponse,
	Interaction,
	InteractionCallbackData,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { SentencePair } from 'logos/src/commands/language/data/types.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector, random } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.game),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleStartGame,
};

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function handleStartGame(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const sentencePairs = client.features.sentencePairs.get(guild.language);
	if (sentencePairs === undefined || sentencePairs.length === 0) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.game.strings.noSentencesAvailable, interaction.locale),
						color: configuration.messages.colors.yellow,
					}],
				},
			},
		);
	}

	await sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: { flags: ApplicationCommandFlags.Ephemeral },
		},
	);

	let sentenceSelection: SentenceSelection;
	let embedColor = configuration.messages.colors.blue;

	const customId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: (bot, selection) => {
			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			const selectionCustomId = selection.data?.customId;
			if (selectionCustomId === undefined) return;

			const indexString = selectionCustomId.split('|').at(1);
			if (indexString === undefined) return;

			const index = Number(indexString);
			if (isNaN(index)) return;

			if (index < 0 || index > sentenceSelection.choices.length - 1) return;

			const choice = sentenceSelection.choices.at(index);
			const isCorrect = choice === sentenceSelection.word;

			embedColor = isCorrect ? configuration.messages.colors.green : configuration.messages.colors.red;

			sentenceSelection = createSentenceSelection(sentencePairs);

			return void editOriginalInteractionResponse(
				bot,
				interaction.token,
				createGameView(customId, sentenceSelection, embedColor, interaction.locale),
			);
		},
	});

	sentenceSelection = createSentenceSelection(sentencePairs);

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		createGameView(customId, sentenceSelection, embedColor, interaction.locale),
	);
}

function createGameView(
	customId: string,
	sentenceSelection: SentenceSelection,
	embedColor: number,
	locale: string | undefined,
): InteractionCallbackData {
	return {
		embeds: [{
			color: embedColor,
			fields: [{
				name: localise(Commands.game.strings.sentence, locale),
				value: sentenceSelection.pair.sentence,
			}, {
				name: localise(Commands.game.strings.translation, locale),
				value: sentenceSelection.pair.translation,
			}],
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			// @ts-ignore: There are always 4 buttons for the 4 sentences selected.
			components: sentenceSelection.choices.map(
				(choice, index) => ({
					type: MessageComponentTypes.Button,
					style: ButtonStyles.Success,
					label: choice,
					customId: `${customId}|${index}`,
				}),
			),
		}],
	};
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

/**
 * Takes an array, duplicates it, shuffles it and returns the shuffled view.
 *
 * @param array - The array to shuffle.
 * @returns The shuffled array.
 */
function shuffle<T>(array: T[]): T[] {
	const shuffled = Array.from(array);

	for (let index = 0; index < array.length - 1; index++) {
		const random = Math.floor(Math.random() * (index + 1));
		const temporary = shuffled.at(index)!;
		shuffled[index] = shuffled.at(random)!;
		shuffled[random] = temporary!;
	}

	return shuffled;
}

function createSentenceSelection(
	sentencePairs: SentencePair[],
): SentenceSelection {
	const indexes = Array.from({ length: 4 }, () => random(sentencePairs.length));

	const pair = sentencePairs.at(indexes.at(0)!)!;
	const words = pair.sentence.split(' ');
	const wordIndex = random(words.length);
	const word = words.at(wordIndex)!;
	words[wordIndex] = '\\_'.repeat(word.split('').length);
	pair.sentence = words.join(' ');

	indexes.shift();

	const choices: string[] = [word];
	for (const index of indexes) {
		const words = sentencePairs.at(index)!.sentence.split(' ');
		choices.push(words.at(random(words.length))!);
	}

	const shuffled = shuffle(choices);

	return {
		pair: pair,
		word: word,
		choices: shuffled,
	};
}

export default command;
