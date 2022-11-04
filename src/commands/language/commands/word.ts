import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	editOriginalInteractionResponse,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { diagnosticMentionUser, fromHex, parseArguments } from '../../../utils.ts';
import { show } from '../../parameters.ts';
import { DictionaryEntry, getEmbedFields } from '../data/dictionary.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.word),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: word,
	options: [{
		...createLocalisations(Commands.word.options.word),
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}, {
		...createLocalisations(Commands.word.options.verbose),
		type: ApplicationCommandOptionTypes.Boolean,
	}, show],
};

/** Allows the user to look up a word and get information about it. */
async function word(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ word, verbose, show }] = parseArguments(
		interaction.data?.options,
		{ verbose: 'boolean', show: 'boolean' },
	);
	if (!word) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const dictionaries = client.features.dictionaryAdapters.get('Romanian');
	if (!dictionaries) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(
							Commands.word.strings.noDictionaryAdapters,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
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
			data: { flags: !show ? ApplicationCommandFlags.Ephemeral : undefined },
		},
	);

	client.log.info(
		`Looking up the word '${word}' from ${dictionaries.length} dictionaries ` +
			`as requested by ${diagnosticMentionUser(interaction.user, true)} on ${guild.name}...`,
	);

	const entries: DictionaryEntry[] = [];
	for (const dictionary of dictionaries) {
		const data = await dictionary.query(word, guild.language);
		if (!data) continue;

		const entries_ = dictionary.parse(data);
		if (!entries_) continue;

		entries.push(...entries_);
	}

	if (entries.length !== 0) {
		const entry = entries.at(0)!;

		const fields = getEmbedFields(entry, interaction.locale, { verbose });
		const hasEntry = fields.length > 0;
		if (!hasEntry) return;

		return void editOriginalInteractionResponse(bot, interaction.token, {
			embeds: [{
				title: entry.word,
				fields: fields,
				color: fromHex('#d6e3f8'),
			}],
		});
	}

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				description: localise(
					Commands.word.strings.noResults,
					interaction.locale,
				),
				color: configuration.interactions.responses.colors.yellow,
			}],
		},
	);
}

export default command;
