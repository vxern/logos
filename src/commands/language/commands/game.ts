import {
	ApplicationCommandFlags,
	ButtonComponent,
	ButtonStyles,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client, getLanguage } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import { createInteractionCollector, random } from '../../../utils.ts';
import { SentencePair } from '../data/sentence.ts';
import { sentenceLists } from '../module.ts';

const command: CommandBuilder = {
	name: 'game',
	nameLocalizations: {
		pl: 'gra',
		ro: 'joc',
	},
	description: 'Pick the correct word out of four to fit in the blank.',
	descriptionLocalizations: {
		pl: 'Wybierz słowo, które pasuje do luki w zdaniu.',
		ro: 'Alege cuvântul care se potrivește cu spațiul gol în propoziție.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: initialiseGame,
};

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function initialiseGame(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const language = getLanguage(client, interaction.guildId!);

	const sentencePairs = Object.values(sentenceLists[language] ?? {});
	const hasSentencePairs = sentencePairs.length !== 0;

	await sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: { flags: ApplicationCommandFlags.Ephemeral },
		},
	);

	if (!hasSentencePairs) {
		console.error(
			`${interaction.user.username} attempted to start playing the language game in ${
				capitalise(language)
			}, but there are no available sentences for that language.`,
		);

		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.DeferredUpdateMessage,
				data: {
					embeds: [{
						title: 'No available sentences.',
						description:
							`There are no sentences available to learn from for ${language}.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	let ribbonColor = configuration.interactions.responses.colors.blue;

	const customId = createInteractionCollector(client, {
		type: InteractionTypes.MessageComponent,
		userId: interaction.user.id,
		onCollect: (bot, selection) => {
			const sentenceSelection = createSentenceSelection(sentencePairs);

			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
				data: {
					embeds: [{
						color: ribbonColor,
						fields: [{
							name: 'Sentence',
							value: sentenceSelection.pair.sentence,
						}, {
							name: 'Translation',
							value: sentenceSelection.pair.translation,
						}],
					}],
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: <[
							ButtonComponent,
							ButtonComponent,
							ButtonComponent,
							ButtonComponent,
						]> (<unknown> sentenceSelection.choices.map(
							(choice, index) => ({
								type: MessageComponentTypes.Button,
								style: ButtonStyles.Success,
								label: choice,
								customId: `${customId}|${index}`,
							}),
						)),
					}],
				},
			});

			sendInteractionResponse(bot, interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			const selectionCustomId = selection.data?.customId;
			if (!selectionCustomId) return;

			const indexString = selectionCustomId.split('|').at(1);
			if (!indexString) return;

			const index = Number(indexString);
			if (isNaN(index)) return;

			if (index < 0 || index > sentenceSelection.choices.length - 1) return;

			const choice = sentenceSelection.choices[index];
			const isCorrect = choice === sentenceSelection.word;

			ribbonColor = isCorrect
				? configuration.interactions.responses.colors.green
				: configuration.interactions.responses.colors.red;
		},
	});

	return;
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
		const temporary = shuffled[index]!;
		shuffled[index] = shuffled[random]!;
		shuffled[random] = temporary!;
	}

	return shuffled;
}

function createSentenceSelection(
	sentencePairs: SentencePair[],
): SentenceSelection {
	const indexes = Array.from({ length: 4 }, () => random(sentencePairs.length));

	const pair = sentencePairs[indexes[0]!]!;
	const words = pair.sentence.split(' ');
	const wordIndex = random(words.length);
	const word = words[wordIndex]!;
	words[wordIndex] = '\\_'.repeat(word.split('').length);
	pair.sentence = words.join(' ');

	indexes.shift();

	const choices: string[] = [word];
	for (const index of indexes) {
		const words = sentencePairs[index]!.sentence.split(' ');
		choices.push(words[random(words.length)]!);
	}

	const shuffled = shuffle(choices);

	return {
		pair: pair,
		word: word,
		choices: shuffled,
	};
}

export default command;
