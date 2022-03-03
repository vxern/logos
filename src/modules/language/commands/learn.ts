import { ButtonStyle, Collector, Interaction, InteractionMessageComponentData, InteractionResponseType, MessageComponentType } from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from "../../../formatting.ts";
import { random } from "../../../utils.ts";
import { SentencePair, SentenceSelection } from "../data/sentence.ts";
import { sentenceLists } from '../module.ts'

const command: Command = {
	name: 'learn',
	availability: Availability.MEMBERS,
	description: 'Pick the correct word out of four to fit in the blank.',
	handle: learn,
};

async function learn(interaction: Interaction): Promise<void> {
	const language = Client.getLanguage(interaction.guild!);
	const sentencePairs = Object.values(sentenceLists[language] ?? {});
  const hasSentencePairs = sentencePairs.length > 0;

	const response = await interaction.respond({
		type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
		ephemeral: true,
	});

	if (!hasSentencePairs) {
		console.log(
			`${interaction.user.username} attempted to start playing the language game in ${
				capitalise(language)
			}, but there are no available sentences for the language.`,
		);
		response.editResponse({
			embeds: [{
				title: 'No available sentences.',
				description: `There are no sentences available for the ${
					capitalise(language)
				} language to learn from.`,
				color: configuration.responses.colors.red,
			}],
		});
		return;
	}

	const collector = new Collector({
		event: 'interactionCreate',
		client: interaction.client,
		filter: (selection) => {
			if (!(selection instanceof Interaction)) {
				return false;
			}
			if (!(selection.data as InteractionMessageComponentData)?.custom_id?.startsWith('LANGUAGE_GAME')) {
				return false;
			}
			if (!selection.isMessageComponent()) {
				return false;
			}
      if (selection.user.id !== interaction.user.id) return false;
      if (selection.message.interaction?.id !== interaction.id) {
        return false;
      }
			return true;
		},
		deinitOnEnd: true,
	});

  collector.collect();

  let color = configuration.responses.colors.blue;

  while (true) {
    try {
      const sentenceSelection = createSentenceSelection(sentencePairs);

      const buttons = sentenceSelection.choices.map((choice, index) => { return {
        type: MessageComponentType.BUTTON,
        style: ButtonStyle.GREEN,
        label: choice,
        customID: `LANGUAGE_GAME|${index}`,
      }});
  
      response.editResponse({
        embeds: [{
          color: color,
          fields: [{
            name: 'Sentence',
            value: sentenceSelection.pair.sentence,
          }, {
            name: 'Translation',
            value: sentenceSelection.pair.translation,
          }]
        }],
        components: [{
          type: MessageComponentType.ACTION_ROW,
          components: buttons,
        }],
        ephemeral: true,
      });

      const collected = await collector.waitFor('collect');

      const selection = collected[0] as Interaction;
      selection.respond({
				type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
			});
      const index = Number(
				(selection.data! as InteractionMessageComponentData).custom_id.split('|')[1],
			);

      const choice = sentenceSelection.choices[index];

      color = choice === sentenceSelection.word 
        ? configuration.responses.colors.green
        : configuration.responses.colors.red;
    } catch (error) {
      console.error(error);
      return;
    }
  }
}

function createSentenceSelection(sentencePairs: SentencePair[]): SentenceSelection {
  const indexes = Array.from({length: 4}, () => random(sentencePairs.length));

  const pair = sentencePairs[indexes[0]];
  const words = pair.sentence.split(' ');
  const wordIndex = random(words.length);
  const word = words[wordIndex];
  words[wordIndex] = '\\_'.repeat(word.split('').length);
  pair.sentence = words.join(' ');

  indexes.shift();

  const choices: string[] = [word];
  for (const index of indexes) {
    const words = sentencePairs[index].sentence.split(' ');
    choices.push(words[random(words.length)]);
  }

  return {
    pair: pair,
    word: word,
    choices: choices,
  };
}

export default command;
