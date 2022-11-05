import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	ButtonStyles,
	editOriginalInteractionResponse,
	Embed,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponents,
	MessageComponentTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { createInteractionCollector, diagnosticMentionUser, fromHex, parseArguments } from '../../../utils.ts';
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

	if (entries.length === 0) {
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

	let pageIndex = 0;
	const isFirst = () => pageIndex === 0;
	const isLast = () => pageIndex === entries.length - 1;

	const generateView = (selection?: Interaction): void => {
		if (selection) {
			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});
		}

		editOriginalInteractionResponse(bot, interaction.token, {
			embeds: [generateEmbed()],
			components: generateButtons(),
		});
	};

	const previousPageButtonId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		doesNotExpire: true,
		onCollect: (_bot, selection) => {
			if (!isFirst()) pageIndex--;
			return void generateView(selection);
		},
	});

	const nextPageButtonId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		doesNotExpire: true,
		onCollect: (_bot, selection) => {
			if (!isLast()) pageIndex++;
			return void generateView(selection);
		},
	});

	const generateEmbed: () => Embed = () => {
		const entry = entries.at(pageIndex)!;

		const fields = getEmbedFields(entry, interaction.locale, { verbose: verbose ?? false });

		return {
			title: entry.word,
			fields: fields,
			color: fromHex('#d6e3f8'),
		};
	};

	const generateButtons = (): MessageComponents => {
		if (isFirst() && isLast()) return [];

		return [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				label: '«',
				customId: previousPageButtonId,
				style: ButtonStyles.Secondary,
				disabled: isFirst(),
			}, {
				type: MessageComponentTypes.Button,
				label: `${localise(Commands.word.strings.page, interaction.locale)} ${pageIndex + 1}/${entries.length}`,
				style: ButtonStyles.Secondary,
				customId: 'none',
			}, {
				type: MessageComponentTypes.Button,
				label: '»',
				customId: nextPageButtonId,
				style: ButtonStyles.Secondary,
				disabled: isLast(),
			}],
		}];
	};

	return void generateView();
}

export default command;
