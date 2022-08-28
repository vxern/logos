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
import { dictionaryAdaptersByLanguage } from '../module.ts';

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
			pl: 'wyświetl',
			ro: 'afișează',
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
	const dictionaries = dictionaryAdaptersByLanguage.get(language);
	if (!dictionaries) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: `There are no dictionary adapters installed for the ${
							capitalise(language)
						} language.`,
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	await sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
			},
		},
	);

	let entry: DictionaryEntry = { headword: word };

	const promises = [];
	for (const dictionary of dictionaries) {
		const promise = dictionary.lookup(
			{ word, native: language },
			dictionary.queryBuilder,
		).catch();

		promise.then((result) => {
			entry = { ...result, ...entry };

			const fields = toFields(entry, { verbose: verbose });
			const hasEntry = fields.length > 0;
			if (!hasEntry) return;

			editInteractionResponse(client.bot, interaction.token, {
				embeds: [{
					title: entry.headword,
					fields: fields,
					color: fromHex('#d6e3f8'),
				}],
			});
		});

		promises.push(promise);
	}

	await Promise.all(promises).catch();

	const responded = toFields(entry, { verbose: verbose }).length > 0;
	if (responded) return;

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				embeds: [{
					description: `No results found.`,
					color: configuration.interactions.responses.colors.red,
				}],
			},
		},
	);
}

export default command;
