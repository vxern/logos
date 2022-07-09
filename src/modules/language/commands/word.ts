import {
	ApplicationCommandOptionType,
	Interaction,
	InteractionApplicationCommandData,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import { fromHex } from '../../../utils.ts';
import { DictionaryEntry, toFields } from '../data/dictionary.ts';
import { dictionaryAdapterLists } from '../module.ts';

const command: Command = {
	name: 'word',
	availability: Availability.MEMBERS,
	description: 'Looks up a word in a dictionary.',
	options: [{
		name: 'word',
		description: 'The word too look up.',
		required: true,
		type: ApplicationCommandOptionType.STRING,
	}, {
		name: 'verbose',
		description:
			'If set to true, the dictionary entry will be displayed in a more verbose format.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}, {
		name: 'show',
		description:
			'If set to true, the dictionary entry will be shown to other users.',
		type: ApplicationCommandOptionType.BOOLEAN,
	}],
	handle: word,
};

async function word(client: Client, interaction: Interaction): Promise<void> {
	const data = <InteractionApplicationCommandData> interaction.data!;
	const word = <string> data.options[0]!.value!;
	const verbose =
		data.options.find((option) => option.name === 'verbose')?.value ?? true;
	const show = data.options.find((option) => option.name === 'show')?.value ??
		false;

	const language = client.getLanguage(interaction.guild!);
	const dictionaries = Object.values(dictionaryAdapterLists[language] ?? {});
	const hasDictionaries = dictionaries.length > 0;

	const response = await interaction.defer(!hasDictionaries || !show);

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
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	let entry: DictionaryEntry = { headword: word };
	const responses = dictionaries.map((dictionary) =>
		dictionary.lookup({ word: word, native: language }, dictionary.queryBuilder)
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
			.catch()
	);

	await Promise.all(responses).catch();

	const hasEntry = toFields(entry, { verbose: verbose }).length > 0;
	if (hasEntry) return;

	response.editResponse({
		embeds: [{
			title: 'No results found.',
			description: `There are no results for the word '${word}'.`,
			color: configuration.interactions.responses.colors.red,
		}],
	});
}

export default command;
