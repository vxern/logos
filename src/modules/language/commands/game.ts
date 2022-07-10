import {
	ButtonStyle,
	Interaction,
	InteractionResponseType,
	InteractionType,
	MessageComponentData,
	MessageComponentInteraction,
	MessageComponentType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import { createInteractionCollector, random } from '../../../utils.ts';
import { SentencePair } from '../data/sentence.ts';
import { sentenceLists } from '../module.ts';

const command: Command = {
	name: 'game',
	availability: Availability.MEMBERS,
	description: 'Pick the correct word out of four to fit in the blank.',
	handle: game,
};

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function game(client: Client, interaction: Interaction): Promise<void> {
	const language = client.getLanguage(interaction.guild!);

	const sentencePairs = Object.values(sentenceLists[language] ?? {});
	const hasSentencePairs = sentencePairs.length !== 0;

	const response = await interaction.defer(true);

	if (!hasSentencePairs) {
		console.error(
			`${interaction.user.username} attempted to start playing the language game in ${
				capitalise(language)
			}, but there are no available sentences for that language.`,
		);

		response.editResponse({
			embeds: [{
				title: 'No available sentences.',
				description: `There are no sentences available for the ${
					capitalise(language)
				} language to learn from.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	const [collector, customID] = createInteractionCollector(client, {
		type: InteractionType.MESSAGE_COMPONENT,
		user: interaction.user,
	});

	let ribbonColor = configuration.interactions.responses.colors.blue;
	while (true) {
		try {
			const sentenceSelection = createSentenceSelection(sentencePairs);

			response.editResponse({
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
					type: MessageComponentType.ACTION_ROW,
					components: sentenceSelection.choices.map<MessageComponentData>(
						(choice, index) => ({
							type: MessageComponentType.BUTTON,
							style: ButtonStyle.GREEN,
							label: choice,
							customID: `${customID}|${index}`,
						}),
					),
				}],
				ephemeral: true,
			});

			const selection =
				// deno-lint-ignore no-await-in-loop
				<MessageComponentInteraction> (await collector.waitFor('collect'))[0];
			selection.respond({
				type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
			});

			const index = Number(selection.data!.custom_id.split('|')[1]!);
			const choice = sentenceSelection.choices[index];
			const isCorrect = choice === sentenceSelection.word;

			ribbonColor = isCorrect
				? configuration.interactions.responses.colors.green
				: configuration.interactions.responses.colors.red;
		} catch (error) {
			console.error(error);
			return;
		}
	}
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
