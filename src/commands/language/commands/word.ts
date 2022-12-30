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
} from 'discordeno';
import { Commands, createLocalisations, localise, Words } from 'logos/assets/localisations/mod.ts';
import { Definition, DictionaryEntry, Expression } from 'logos/src/commands/language/data/types.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector, parseArguments } from 'logos/src/interactions.ts';
import { chunk, diagnosticMentionUser } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { BulletStyles, code, list } from 'logos/formatting.ts';
import { defaultLocale, WordTypes } from 'logos/types.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.word),
	isRateLimited: true,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleSearchWord,
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
async function handleSearchWord(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ word, verbose, show }] = parseArguments(
		interaction.data?.options,
		{ verbose: 'boolean', show: 'boolean' },
	);
	if (word === undefined) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const dictionaries = client.features.dictionaryAdapters.get('Romanian');
	if (dictionaries === undefined) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.word.strings.noDictionaryAdapters, interaction.locale),
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	const locale = show ? defaultLocale : interaction.locale;

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
		if (data === undefined) continue;

		const entriesNew = dictionary.parse(data, locale);
		if (entriesNew === undefined) continue;

		entries.push(...entriesNew);
	}

	if (entries.length === 0) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(Commands.word.strings.noResults, locale),
					color: constants.colors.dullYellow,
				}],
			},
		);
	}

	return void displayMenu(
		[client, bot],
		interaction,
		undefined,
		{
			entries,
			currentView: ContentTabs.Definitions,
			dictionaryEntryIndex: 0,
			inflectionTableIndex: 0,
			verbose: verbose ?? false,
		},
		locale,
	);
}

enum ContentTabs {
	Definitions = 0,
	Inflection,
}

interface WordViewData {
	readonly entries: DictionaryEntry[];
	currentView: ContentTabs;
	dictionaryEntryIndex: number;
	inflectionTableIndex: number;
	verbose: boolean;
}

function displayMenu(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	selection: Interaction | undefined,
	data: WordViewData,
	locale: string | undefined,
): void {
	if (selection !== undefined) {
		sendInteractionResponse(bot, selection.id, selection.token, {
			type: InteractionResponseTypes.DeferredUpdateMessage,
		});
	}

	const entry = data.entries.at(data.dictionaryEntryIndex)!;

	editOriginalInteractionResponse(bot, interaction.token, {
		embeds: generateEmbeds(data, entry, locale),
		components: generateButtons([client, bot], interaction, data, entry, locale),
	});
}

function generateEmbeds(
	data: WordViewData,
	entry: DictionaryEntry,
	locale: string | undefined,
): Embed[] {
	switch (data.currentView) {
		case ContentTabs.Definitions: {
			return entryToEmbeds(entry, locale, data.verbose);
		}
		case ContentTabs.Inflection: {
			return [entry.inflectionTable!.at(data.inflectionTableIndex)!];
		}
	}
}

function generateButtons(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: WordViewData,
	entry: DictionaryEntry,
	locale: string | undefined,
): MessageComponents {
	const paginationControls: ButtonComponent[][] = [];

	switch (data.currentView) {
		case ContentTabs.Definitions: {
			const isFirst = data.dictionaryEntryIndex === 0;
			const isLast = data.dictionaryEntryIndex === data.entries.length - 1;

			if (isFirst && isLast) break;

			const previousPageButtonId = createInteractionCollector([client, bot], {
				type: InteractionTypes.MessageComponent,
				onCollect: (_bot, selection) => {
					if (!isFirst) data.dictionaryEntryIndex--;
					return void displayMenu([client, bot], interaction, selection, data, locale);
				},
			});

			const nextPageButtonId = createInteractionCollector([client, bot], {
				type: InteractionTypes.MessageComponent,
				onCollect: (_bot, selection) => {
					if (!isLast) data.dictionaryEntryIndex++;
					return void displayMenu([client, bot], interaction, selection, data, locale);
				},
			});

			const pageString = localise(Commands.word.strings.page, locale);

			paginationControls.push([{
				type: MessageComponentTypes.Button,
				label: '«',
				customId: previousPageButtonId,
				style: ButtonStyles.Secondary,
				disabled: isFirst,
			}, {
				type: MessageComponentTypes.Button,
				label: `${pageString} ${data.dictionaryEntryIndex + 1}/${data.entries.length}`,
				style: ButtonStyles.Secondary,
				customId: 'none',
			}, {
				type: MessageComponentTypes.Button,
				label: '»',
				customId: nextPageButtonId,
				style: ButtonStyles.Secondary,
				disabled: isLast,
			}]);

			break;
		}
		case ContentTabs.Inflection: {
			if (entry.inflectionTable === undefined) return [];

			const rows = chunk(entry.inflectionTable, 5);
			rows.reverse();

			const buttonId = createInteractionCollector([client, bot], {
				type: InteractionTypes.MessageComponent,
				onCollect: (_bot, selection) => {
					if (entry.inflectionTable === undefined || selection.data === undefined) {
						return void displayMenu([client, bot], interaction, selection, data, locale);
					}

					const [_buttonId, indexString] = selection.data.customId!.split('|');
					const index = Number(indexString);

					if (index >= 0 && index <= entry.inflectionTable?.length) {
						data.inflectionTableIndex = index;
					}

					return void displayMenu([client, bot], interaction, selection, data, locale);
				},
			});

			for (const [row, rowIndex] of rows.map<[typeof entry.inflectionTable, number]>((r, i) => [r, i])) {
				const buttons = row.map<ButtonComponent>((table, index) => {
					const index_ = rowIndex * 5 + index;

					return {
						type: MessageComponentTypes.Button,
						label: table.title,
						customId: `${buttonId}|${index_}`,
						disabled: data.inflectionTableIndex === index_,
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
			data.inflectionTableIndex = 0;
			data.currentView = ContentTabs.Definitions;
			return void displayMenu([client, bot], interaction, selection, data, locale);
		},
	});

	const inflectionMenuButtonId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		onCollect: (_bot, selection) => {
			data.currentView = ContentTabs.Inflection;
			return void displayMenu([client, bot], interaction, selection, data, locale);
		},
	});

	if (entry.definitions !== undefined) {
		row.push({
			type: MessageComponentTypes.Button,
			label: localise(Commands.word.strings.definitions, locale),
			disabled: data.currentView === ContentTabs.Definitions,
			customId: definitionsMenuButtonId,
			style: ButtonStyles.Primary,
		});
	}

	if (entry.inflectionTable !== undefined) {
		row.push({
			type: MessageComponentTypes.Button,
			label: localise(Commands.word.strings.inflection, locale),
			disabled: data.currentView === ContentTabs.Inflection,
			customId: inflectionMenuButtonId,
			style: ButtonStyles.Primary,
		});
	}

	if (row.length > 1) {
		paginationControls.push(row);
	}

	// @ts-ignore: It is sure that there will be no more than 5 buttons.
	return paginationControls.map((row) => ({
		type: MessageComponentTypes.ActionRow,
		components: row,
	}));
}

function entryToEmbeds(entry: DictionaryEntry, locale: string | undefined, verbose: boolean): Embed[] {
	let typeDisplayed!: string;
	if (entry.type === undefined) {
		typeDisplayed = localise(Words.types[WordTypes.Unknown], locale);
	} else {
		const [type, typeString] = entry.type;
		typeDisplayed = localise(Words.types[type], locale);
		if (type === WordTypes.Unknown) {
			typeDisplayed += ` — '${typeString}'`;
		}
	}
	typeDisplayed = `***${typeDisplayed}***`;

	const word = entry.word;

	const embeds: Embed[] = [];
	const fields: DiscordEmbedField[] = [];

	if (entry.definitions !== undefined && entry.definitions.length !== 0) {
		const definitionsStringified = stringifyEntries(entry.definitions, 'definitions', BulletStyles.Diamond);
		const definitionsFitted = fitStringsToFieldSize(definitionsStringified, locale, verbose);

		if (!verbose) {
			fields.push({ name: localise(Commands.word.strings.fields.definitions, locale), value: definitionsFitted });
		} else {
			embeds.push({
				title: localise(Commands.word.strings.definitionsForWord, locale)(word),
				description: `${typeDisplayed}\n\n${definitionsFitted}`,
				color: constants.colors.husky,
			});
		}
	}

	if (entry.expressions !== undefined && entry.expressions.length !== 0) {
		const expressionsStringified = stringifyEntries(entry.expressions, 'expressions', BulletStyles.Arrow);
		const expressionsFitted = fitStringsToFieldSize(expressionsStringified, locale, verbose);

		const sectionName = localise(Commands.word.strings.fields.expressions, locale);

		if (!verbose) {
			fields.push({ name: sectionName, value: expressionsFitted });
		} else {
			embeds.push({ title: sectionName, description: expressionsFitted, color: constants.colors.husky });
		}
	}

	if (entry.etymologies !== undefined && entry.etymologies.length !== 0) {
		const sectionName = localise(Commands.word.strings.fields.etymology, locale);
		const etymology = entry.etymologies.map((etymology) => {
			if (etymology.tags === undefined) {
				return `**${etymology.value}**`;
			}

			if (etymology.value === undefined) {
				return tagsToString(etymology.tags);
			}

			return `${tagsToString(etymology.tags)} **${etymology.value}**`;
		}).join('\n');

		if (!verbose) {
			fields.push({ name: sectionName, value: etymology });
		} else {
			embeds.push({ title: sectionName, description: etymology, color: constants.colors.husky });
		}
	}

	if (!verbose) {
		return [{ title: word, description: typeDisplayed, fields, color: constants.colors.husky }];
	}

	return embeds;
}

function tagsToString(tags: string[]): string {
	return tags.map((tag) => code(tag)).join(' ');
}

function stringifyEntries(
	entries: Definition[] | Expression[],
	entryType: 'definitions' | 'expressions',
	bulletStyle: BulletStyles,
	depth = 0,
): string[] {
	const entriesStringified = entries.map((entry) => {
		const root = entry.tags === undefined ? entry.value : `${tagsToString(entry.tags)} ${entry.value}`;

		if (
			entryType === 'definitions' && (entry as Definition)?.value.endsWith(':') &&
			(entry as Definition)?.definitions !== undefined
		) {
			const entriesStringified = stringifyEntries(
				(entry as Definition).definitions!,
				'definitions',
				bulletStyle,
				depth + 1,
			).join('\n');
			return `${root}\n${entriesStringified}`;
		}

		return root;
	});
	const entriesEnlisted = list(entriesStringified, bulletStyle);
	const entriesDelisted = entriesEnlisted.split('\n').map((entry) => `${'⠀'.repeat(depth * 2)}${entry}`);

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
		const definitionsOmittedString = localise(Commands.word.strings.definitionsOmitted, locale)(stringsOmitted);
		fittedString += `\n\n*${definitionsOmittedString}*`;
	}

	return fittedString;
}

export default command;
