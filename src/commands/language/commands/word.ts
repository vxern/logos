import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	editInteractionResponse,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client, getLanguage } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { capitalise } from '../../../formatting.ts';
import { fromHex } from '../../../utils.ts';
import { DictionaryEntry, toFields } from '../data/dictionary.ts';
import { dictionaryAdapterLists } from '../module.ts';

const command: CommandBuilder = {
	name: 'word',
	nameLocalizations: {
		pl: 'słowo',
		ro: 'cuvânt',
	},
	description: 'Displays information about a given word.',
	descriptionLocalizations: {
		pl: 'Wyświetla informacje o danym słowie.',
		ro: 'Afișează informații despre un cuvânt dat.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: word,
	options: [{
		name: 'word',
		nameLocalizations: {
			pl: 'słowo',
			ro: 'cuvânt',
		},
		description: 'The word to display information about.',
		descriptionLocalizations: {
			pl: 'Słowo, o którym mają być wyświetlone informacje.',
			ro: 'Cuvântul despre care să fie afișate informații.',
		},
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}, {
		name: 'verbose',
		nameLocalizations: {
			pl: 'tryb-rozwlekły',
			ro: 'mod-prolix',
		},
		description:
			'If set to true, more (perhaps unnecessary) information will be shown.',
		descriptionLocalizations: {
			pl:
				'Jeśli tak, więcej (możliwie niepotrzebnych) informacji będzie pokazanych.',
			ro: 'Dacă da, mai multe (posibil inutile) informații vor fi afișate.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}, {
		name: 'show',
		nameLocalizations: {
			pl: 'wyświetlić-innym',
			ro: 'arată-le-celorlalți',
		},
		description:
			'If set to true, the dictionary entry will be shown to other users.',
		descriptionLocalizations: {
			pl: 'Jeśli tak, artykuł będzie wyświetlony innym użytkownikom.',
			ro: 'Dacă da, articolul va fi afișat altor utilizatori.',
		},
		type: ApplicationCommandOptionTypes.Boolean,
	}],
};

/** Allows the user to look up a word and get information about it. */
async function word(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = interaction.data;
	if (!data) return;

	const word = <string | undefined> data.options?.at(0)?.value;
	if (!word) return;

	const verbose =
		<boolean> data.options?.find((option) => option.name === 'verbose')
			?.value ??
			false;
	const show =
		<boolean> data.options?.find((option) => option.name === 'show')?.value ??
			false;

	const language = getLanguage(client, interaction.guildId!);

	const dictionaries = Object.values(dictionaryAdapterLists[language] ?? {});
	const hasDictionaries = dictionaries.length > 0;

	const response = await sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: {
				flags: (!hasDictionaries || !show)
					? ApplicationCommandFlags.Ephemeral
					: undefined,
			},
		},
	);
	if (!response) return;

	if (!hasDictionaries) {
		console.error(
			`${interaction.user.username} attempted to look up '${word}' in ${
				capitalise(language)
			}, but there are no available dictionaries for that language.`,
		);

		return void editInteractionResponse(client.bot, interaction.token, {
			messageId: response.id,
			embeds: [{
				title: 'No available dictionaries.',
				description: `There are no dictionary adapters installed for the ${
					capitalise(language)
				} language.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	let entry: DictionaryEntry = { headword: word };
	const responses = dictionaries.map((dictionary) =>
		dictionary.lookup({ word: word, native: language }, dictionary.queryBuilder)
			.then((result) => {
				entry = { ...result, ...entry };

				const fields = toFields(entry, { verbose: verbose });
				const hasEntry = fields.length > 0;
				if (!hasEntry) return;

				editInteractionResponse(client.bot, interaction.token, {
					messageId: response.id,
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

	return void editInteractionResponse(client.bot, interaction.token, {
		embeds: [{
			title: 'No results found.',
			description: `There are no results for the word '${word}'.`,
			color: configuration.interactions.responses.colors.red,
		}],
	});
}

export default command;
