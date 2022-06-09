import {
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { OptionType } from '../../../commands/option.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import { fromHex } from '../../../utils.ts';
import { DictionaryEntry, toFields } from '../data/dictionary.ts';
import { dictionaryLists } from '../module.ts';

const command: Command = {
	name: 'word',
	availability: Availability.MEMBERS,
	description: 'Looks up a word in a dictionary.',
	options: [{
		name: 'word',
		description: 'The word too look up.',
		required: true,
		type: OptionType.STRING,
	}, {
		name: 'verbose',
		description:
			'If set to true, the dictionary entry will be displayed in a more verbose format.',
		type: OptionType.BOOLEAN,
	}, {
		name: 'show',
		description:
			'If set to true, the dictionary entry will be shown to other users.',
		type: OptionType.BOOLEAN,
	}],
	handle: word,
};

async function word(client: Client, interaction: Interaction): Promise<void> {
	const data = interaction.data! as InteractionApplicationCommandData;
	const word = data.options[0]!.value! as string;
	const verbose =
		data.options.find((option) => option.name === 'verbose')?.value ?? true;
	const show = data.options.find((option) => option.name === 'show')?.value ??
		false;

	const language = client.getLanguage(interaction.guild!);
	const dictionaries = Object.values(dictionaryLists[language] ?? {});
	const hasDictionaries = dictionaries.length > 0;

	const response = await interaction.respond({
		type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE,
		ephemeral: !hasDictionaries || !show,
	});

	if (!hasDictionaries) {
		console.log(
			`${interaction.user.username} attempted to look up '${word}' in ${
				capitalise(language)
			}, but there are no available dictionaries for the language.`,
		);
		response.editResponse({
			embeds: [{
				title: 'No available dictionaries.',
				description: `There are no dictionary adapters installed for the ${
					capitalise(language)
				} language.`,
				color: configuration.responses.colors.red,
			}],
		});
		return;
	}

	let entry: DictionaryEntry = { headword: word };
	const responses = dictionaries.map((dictionary) =>
		dictionary.lookup(word, language)
			.then((result) => {
				entry = { ...result, ...entry };

				const fields = toFields(entry, { verbose: verbose });
				const hasEntry = fields.length > 0;

				if (!hasEntry) return;

				response.editResponse({
					embeds: [{
						title: entry.headword,
						fields: fields,
						color: fromHex('#d6e3f8'),
					}],
				});
			})
			.catch(() => {})
	);

	await Promise.all(responses).catch();

	const hasEntry = toFields(entry, { verbose: verbose }).length > 0;
	if (hasEntry) return;

	response.editResponse({
		embeds: [{
			title: 'No results found.',
			description: `There are no results for the word '${word}'.`,
			color: configuration.responses.colors.red,
		}],
	});
}

export default command;
