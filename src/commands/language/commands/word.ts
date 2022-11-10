import { Commands } from '../../../../assets/localisations/commands.ts';
import { Words } from '../../../../assets/localisations/words.ts';
import { createLocalisations, localise } from '../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	ButtonComponent,
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
import { chunk, createInteractionCollector, diagnosticMentionUser, fromHex, parseArguments } from '../../../utils.ts';
import { show } from '../../parameters.ts';
import { DictionaryEntry, TaggedValue, WordTypes } from '../data/dictionary.ts';

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

enum Views {
	Definitions = 0,
	Inflection,
}

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

		const entries_ = dictionary.parse(data, interaction.locale);
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

	let currentView = Views.Definitions;
	let dictionaryEntryIndex = 0;
	let inflectionTableIndex = 0;

	const isFirst = () => dictionaryEntryIndex === 0;
	const isLast = () => dictionaryEntryIndex === entries.length - 1;
	const getEntry = () => entries.at(dictionaryEntryIndex)!;

	const displayMenu = (selection?: Interaction): void => {
		if (selection) {
			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});
		}

		const entry = getEntry();

		editOriginalInteractionResponse(bot, interaction.token, {
			embeds: [generateEmbed(entry)],
			components: generateButtons(entry),
		});
	};

	const generateEmbed = (entry: DictionaryEntry): Embed => {
		switch (currentView) {
			case Views.Definitions: {
				return getEmbed(entry, interaction.locale, verbose ?? false);
			}
			case Views.Inflection: {
				return entry.inflectionTable!.at(inflectionTableIndex)!;
			}
		}
	};

	const generateButtons = (entry: DictionaryEntry): MessageComponents => {
		const paginationControls: ButtonComponent[][] = [];

		switch (currentView) {
			case Views.Definitions: {
				if (isFirst() && isLast()) break;

				const previousPageButtonId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_bot, selection) => {
						if (!isFirst()) dictionaryEntryIndex--;
						return void displayMenu(selection);
					},
				});

				const nextPageButtonId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_bot, selection) => {
						if (!isLast()) dictionaryEntryIndex++;
						return void displayMenu(selection);
					},
				});

				paginationControls.push([{
					type: MessageComponentTypes.Button,
					label: '«',
					customId: previousPageButtonId,
					style: ButtonStyles.Secondary,
					disabled: isFirst(),
				}, {
					type: MessageComponentTypes.Button,
					label: `${localise(Commands.word.strings.page, interaction.locale)} ${
						dictionaryEntryIndex + 1
					}/${entries.length}`,
					style: ButtonStyles.Secondary,
					customId: 'none',
				}, {
					type: MessageComponentTypes.Button,
					label: '»',
					customId: nextPageButtonId,
					style: ButtonStyles.Secondary,
					disabled: isLast(),
				}]);

				break;
			}
			case Views.Inflection: {
				if (!entry.inflectionTable) return [];

				const rows = chunk(entry.inflectionTable, 5);
				rows.reverse();

				const buttonId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_bot, selection) => {
						if (!entry.inflectionTable || !selection.data) return void displayMenu(selection);

						const [_buttonId, indexString] = selection.data.customId!.split('|');
						const index = Number(indexString);

						if (index >= 0 && index <= entry.inflectionTable?.length) {
							inflectionTableIndex = index;
						}

						return void displayMenu(selection);
					},
				});

				for (const [row, rowIndex] of rows.map<[typeof entry.inflectionTable, number]>((r, i) => [r, i])) {
					const buttons = row.map<ButtonComponent>((table, index) => {
						const index_ = rowIndex * 5 + index;

						return {
							type: MessageComponentTypes.Button,
							label: table.title,
							customId: `${buttonId}|${index_}`,
							disabled: inflectionTableIndex === index_,
							style: ButtonStyles.Secondary,
						};
					});

					if (buttons.length > 1) {
						paginationControls.unshift(buttons);
					}
				}
			}
		}

		const row: ButtonComponent[] = [];

		const definitionsMenuButtonId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: (_bot, selection) => {
				inflectionTableIndex = 0;
				currentView = Views.Definitions;
				return void displayMenu(selection);
			},
		});

		const inflectionMenuButtonId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: (_bot, selection) => {
				currentView = Views.Inflection;
				return void displayMenu(selection);
			},
		});

		if (entry.definitions) {
			row.push({
				type: MessageComponentTypes.Button,
				label: localise(Commands.word.strings.definitions, interaction.locale),
				disabled: currentView === Views.Definitions,
				customId: definitionsMenuButtonId,
				style: ButtonStyles.Primary,
			});
		}

		if (entry.inflectionTable) {
			row.push({
				type: MessageComponentTypes.Button,
				label: localise(Commands.word.strings.inflection, interaction.locale),
				disabled: currentView === Views.Inflection,
				customId: inflectionMenuButtonId,
				style: ButtonStyles.Primary,
			});
		}

		if (row.length > 1) {
			paginationControls.push(row);
		}

		// @ts-ignore
		return paginationControls.map((row) => ({
			type: MessageComponentTypes.ActionRow,
			components: row,
		}));
	};

	return void displayMenu();
}

function getEmbed(
	entry: DictionaryEntry,
	locale: string | undefined,
	verbose: boolean,
): Embed {
	const fields: DiscordEmbedField[] = [];

	if (entry.definitions && entry.definitions.length !== 0) {
		const definitionsStringified = stringifyEntries(entry.definitions, BulletStyles.Diamond);
		const definitionsFitted = fitStringsToFieldSize(definitionsStringified, locale, verbose);

		fields.push({
			name: localise(Commands.word.strings.fields.definitions, locale),
			value: definitionsFitted,
		});
	}

	if (entry.expressions && entry.expressions.length !== 0) {
		const expressionsStringified = stringifyEntries(entry.expressions, BulletStyles.Arrow);
		const expressionsFitted = fitStringsToFieldSize(expressionsStringified, locale, verbose);

		fields.push({
			name: localise(Commands.word.strings.fields.expressions, locale),
			value: expressionsFitted,
		});
	}

	if (entry.etymologies && entry.etymologies.length !== 0) {
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

	let description: string;
	if (!entry.type) {
		description = localise(Words.types[WordTypes.Unknown], locale);
	} else {
		const [type, typeString] = entry.type;
		description = localise(Words.types[type], locale);
		if (type === WordTypes.Unknown) {
			description += ` — '${typeString}'`;
		}
	}

	return {
		title: entry.title ?? entry.word,
		description: `***${description}***`,
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
