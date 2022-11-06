import { Commands } from '../../../../assets/localisations/commands.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	ButtonStyles,
	DiscordEmbedField,
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
import { BulletStyles, list } from '../../../formatting.ts';
import { createInteractionCollector, diagnosticMentionUser, fromHex, parseArguments } from '../../../utils.ts';
import { show } from '../../parameters.ts';
import { DictionaryEntry, TaggedValue } from '../data/dictionary.ts';

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

		return getEmbed(entry, interaction.locale, verbose ?? false);
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

function getEmbed(
	entry: DictionaryEntry,
	locale: string | undefined,
	verbose: boolean,
): Embed {
	const fields: DiscordEmbedField[] = [];

	if (entry.definitions) {
		const definitionsStringified = stringifyEntries(entry.definitions, BulletStyles.Diamond);
		const definitionsFitted = fitStringsToFieldSize(definitionsStringified, locale, verbose);

		fields.push({
			name: localise(Commands.word.strings.fields.definitions, locale),
			value: definitionsFitted,
		});
	}

	if (entry.expressions) {
		const expressionsStringified = stringifyEntries(entry.expressions, BulletStyles.Arrow);
		const expressionsFitted = fitStringsToFieldSize(expressionsStringified, locale, verbose);

		fields.push({
			name: localise(Commands.word.strings.fields.expressions, locale),
			value: expressionsFitted,
		});
	}

	if (entry.etymologies) {
		fields.push({
			name: localise(Commands.word.strings.fields.etymology, locale),
			value: entry.etymologies.map((etymology) => {
				if (!etymology.tags) {
					return `**${etymology.value}**`;
				}

				if (!etymology.value) {
					return tagsToString(etymology.tags);
				}

				return `${tagsToString(etymology.tags)} **${etymology.value}**`;
			}).join('\n'),
		});
	}

	return {
		title: entry.word,
		fields,
		color: fromHex('#d6e3f8'),
	};
}

function tagsToString(tags: string[]): string {
	return tags.map((tag) => `\`${tag}\``).join(' ');
}

function stringifyEntries(entries: TaggedValue<string>[], bulletStyle: BulletStyles): string[] {
	const entriesStringified = entries.map((entry) => {
		if (!entry.tags) {
			return entry.value;
		}

		return `${tagsToString(entry.tags)} ${entry.value}`;
	});
	const entriesEnlisted = list(entriesStringified, bulletStyle);
	const entriesDelisted = entriesEnlisted.split('\n');

	return entriesDelisted;
}

function fitStringsToFieldSize(
	strings: string[],
	locale: string | undefined,
	verbose: boolean,
): string {
	const overheadString = localise(Commands.word.strings.definitionsOmitted, locale)(strings.length);
	const characterOverhead = overheadString.length + 20;

	const maxCharacterCount = verbose ? 4096 : 1024;

	let characterCount = 0;
	const stringsToDisplay: string[] = [];
	for (const [string, index] of strings.map<[string, number]>((s, i) => [s, i])) {
		characterCount += string.length;

		if (characterCount + (index + 1 === strings.length ? 0 : characterOverhead) >= maxCharacterCount) break;

		stringsToDisplay.push(string);
	}

	const stringsOmitted = strings.length - stringsToDisplay.length;

	let fittedString = stringsToDisplay.join('\n');
	if (stringsOmitted !== 0) {
		fittedString += `\n*${localise(Commands.word.strings.definitionsOmitted, locale)(stringsOmitted)}*`;
	}

	return fittedString;
}

export default command;
