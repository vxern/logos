import {
	ApplicationCommandOptionTypes,
	ApplicationCommandTypes,
	Bot,
	ButtonComponent,
	ButtonStyles,
	DiscordEmbedField,
	Embed,
	Interaction,
	InteractionTypes,
	MessageComponents,
	MessageComponentTypes,
} from 'discordeno';
import { Definition, DictionaryEntry, Expression } from 'logos/src/commands/language/data/types.ts';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client, localise } from 'logos/src/client.ts';
import {
	acknowledge,
	createInteractionCollector,
	decodeId,
	editReply,
	encodeId,
	parseArguments,
	postponeReply,
	reply,
} from 'logos/src/interactions.ts';
import { chunk, diagnosticMentionUser } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';
import { BulletStyles, code, list } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: CommandTemplate = {
	name: 'word',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	isRateLimited: true,
	handle: handleFindWord,
	options: [{
		name: 'word',
		type: ApplicationCommandOptionTypes.String,
		required: true,
	}, {
		name: 'verbose',
		type: ApplicationCommandOptionTypes.Boolean,
	}, show],
};

/** Allows the user to look up a word and get information about it. */
async function handleFindWord([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ word, verbose, show }] = parseArguments(interaction.data?.options, { verbose: 'boolean', show: 'boolean' });
	if (word === undefined) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const dictionaries = client.features.dictionaryAdapters.get(guild.language);
	if (dictionaries === undefined) {
		const strings = {
			title: localise(client, 'word.strings.noDictionaryAdapters.title', interaction.locale)(),
			description: localise(client, 'word.strings.noDictionaryAdapters.description', interaction.locale)(),
		};

		return void reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	const locale = show ? defaultLocale : interaction.locale;

	await postponeReply([client, bot], interaction, { visible: show });

	client.log.info(
		`Looking up the word '${word}' from ${dictionaries.length} dictionaries ` +
			`as requested by ${diagnosticMentionUser(interaction.user)} on ${guild.name}...`,
	);

	const entries: DictionaryEntry[] = [];
	for (const dictionary of dictionaries) {
		const data = await dictionary.query(word, guild.language);
		if (data === undefined) continue;

		const entriesNew = dictionary.parse(client, data, locale);
		if (entriesNew === undefined) continue;

		entries.push(...entriesNew);
	}

	if (entries.length === 0) {
		const strings = {
			title: localise(client, 'word.strings.noResults.title', locale)(),
			description: localise(client, 'word.strings.noResults.description', locale)({
				'word': word,
			}),
		};

		return void editReply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});
	}

	return void displayMenu(
		[client, bot],
		interaction,
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
	data: WordViewData,
	locale: string | undefined,
): void {
	const entry = data.entries.at(data.dictionaryEntryIndex)!;

	editReply([client, bot], interaction, {
		embeds: generateEmbeds(client, data, entry, locale),
		components: generateButtons([client, bot], interaction, data, entry, locale),
	});
}

function generateEmbeds(
	client: Client,
	data: WordViewData,
	entry: DictionaryEntry,
	locale: string | undefined,
): Embed[] {
	switch (data.currentView) {
		case ContentTabs.Definitions: {
			return entryToEmbeds(client, entry, locale, data.verbose);
		}
		case ContentTabs.Inflection: {
			return [entry.inflectionTable!.at(data.inflectionTableIndex)!];
		}
	}
}

type MenuButtonID = [index: string];

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
				onCollect: (_, selection) => {
					acknowledge([client, bot], selection);

					if (!isFirst) data.dictionaryEntryIndex--;

					return displayMenu([client, bot], interaction, data, locale);
				},
			});

			const nextPageButtonId = createInteractionCollector([client, bot], {
				type: InteractionTypes.MessageComponent,
				onCollect: (_, selection) => {
					acknowledge([client, bot], selection);

					if (!isLast) data.dictionaryEntryIndex++;

					return displayMenu([client, bot], interaction, data, locale);
				},
			});

			const strings = {
				page: localise(client, 'word.strings.page', locale)(),
			};

			paginationControls.push([{
				type: MessageComponentTypes.Button,
				label: constants.symbols.interactions.menu.controls.back,
				customId: previousPageButtonId,
				style: ButtonStyles.Secondary,
				disabled: isFirst,
			}, {
				type: MessageComponentTypes.Button,
				label: `${strings.page} ${data.dictionaryEntryIndex + 1}/${data.entries.length}`,
				style: ButtonStyles.Secondary,
				customId: constants.staticComponentIds.none,
			}, {
				type: MessageComponentTypes.Button,
				label: constants.symbols.interactions.menu.controls.forward,
				customId: nextPageButtonId,
				style: ButtonStyles.Secondary,
				disabled: isLast,
			}]);

			break;
		}
		case ContentTabs.Inflection: {
			if (entry.inflectionTable === undefined) return [];

			const rows = chunk(entry.inflectionTable, 5).reverse();

			const buttonId = createInteractionCollector([client, bot], {
				type: InteractionTypes.MessageComponent,
				onCollect: (_, selection) => {
					acknowledge([client, bot], selection);

					if (entry.inflectionTable === undefined || selection.data === undefined) {
						return void displayMenu([client, bot], interaction, data, locale);
					}

					const [__, indexString] = decodeId<MenuButtonID>(selection.data.customId!);
					const index = Number(indexString);

					if (index >= 0 && index <= entry.inflectionTable?.length) {
						data.inflectionTableIndex = index;
					}

					return void displayMenu([client, bot], interaction, data, locale);
				},
			});

			for (const [row, rowIndex] of rows.map<[typeof entry.inflectionTable, number]>((r, i) => [r, i])) {
				const buttons = row.map<ButtonComponent>((table, index) => {
					const index_ = rowIndex * 5 + index;

					return {
						type: MessageComponentTypes.Button,
						label: table.title,
						customId: encodeId<MenuButtonID>(buttonId, [index_.toString()]),
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
		onCollect: (_, selection) => {
			acknowledge([client, bot], selection);

			data.inflectionTableIndex = 0;
			data.currentView = ContentTabs.Definitions;

			return displayMenu([client, bot], interaction, data, locale);
		},
	});

	const inflectionMenuButtonId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		onCollect: (_, selection) => {
			acknowledge([client, bot], selection);

			data.currentView = ContentTabs.Inflection;

			return displayMenu([client, bot], interaction, data, locale);
		},
	});

	if (entry.definitions !== undefined) {
		const strings = {
			definitions: localise(client, 'word.strings.definitions', locale)(),
		};

		row.push({
			type: MessageComponentTypes.Button,
			label: strings.definitions,
			disabled: data.currentView === ContentTabs.Definitions,
			customId: definitionsMenuButtonId,
			style: ButtonStyles.Primary,
		});
	}

	if (entry.inflectionTable !== undefined) {
		const strings = {
			inflection: localise(client, 'word.strings.inflection', locale)(),
		};

		row.push({
			type: MessageComponentTypes.Button,
			label: strings.inflection,
			disabled: data.currentView === ContentTabs.Inflection,
			customId: inflectionMenuButtonId,
			style: ButtonStyles.Primary,
		});
	}

	if (row.length > 1) {
		paginationControls.push(row);
	}

	return paginationControls.map((row) => ({
		type: MessageComponentTypes.ActionRow,
		components: row as [ButtonComponent],
	}));
}

type WordClass =
	| 'noun'
	| 'verb'
	| 'adjective'
	| 'adverb'
	| 'adposition'
	| 'affix'
	| 'pronoun'
	| 'determiner'
	| 'conjunction'
	| 'interjection'
	| 'unknown';

const wordClassToStringKey: Required<Record<WordClass, string>> = {
	'noun': 'words.noun',
	'verb': 'words.verb',
	'adjective': 'words.adjective',
	'adverb': 'words.adverb',
	'adposition': 'words.adposition',
	'affix': 'words.affix',
	'pronoun': 'words.pronoun',
	'determiner': 'words.determiner',
	'conjunction': 'words.conjunction',
	'interjection': 'words.interjection',
	'unknown': 'words.unknown',
};

function isUnknownWordClass(wordClass: WordClass): boolean {
	return wordClass === 'unknown';
}

function entryToEmbeds(client: Client, entry: DictionaryEntry, locale: string | undefined, verbose: boolean): Embed[] {
	let wordClassDisplayed: string;
	if (entry.wordClass === undefined) {
		const strings = {
			unknown: localise(client, 'words.unknown', locale)(),
		};

		wordClassDisplayed = strings.unknown;
	} else {
		const [wordClass, wordClassUnresolved] = entry.wordClass;

		const strings = {
			wordClass: localise(client, wordClassToStringKey[wordClass], locale)(),
		};

		wordClassDisplayed = strings.wordClass;
		if (isUnknownWordClass(wordClass)) {
			wordClassDisplayed += ` — '${wordClassUnresolved}'`;
		}
	}
	const wordClassFormatted = `***${wordClassDisplayed}***`;

	const word = entry.word;

	const embeds: Embed[] = [];
	const fields: DiscordEmbedField[] = [];

	if (entry.definitions !== undefined && entry.definitions.length !== 0) {
		const definitionsStringified = stringifyEntries(entry.definitions, 'definitions', BulletStyles.Diamond);
		const definitionsFitted = fitTextToFieldSize(client, definitionsStringified, locale, verbose);

		if (!verbose) {
			const strings = {
				definitions: localise(client, 'word.strings.fields.definitions', locale)(),
			};

			fields.push({
				name: strings.definitions,
				value: definitionsFitted,
			});
		} else {
			const strings = {
				definitionsForWord: localise(client, 'word.strings.definitionsForWord', locale)({ 'word': word }),
			};

			embeds.push({
				title: strings.definitionsForWord,
				description: `${wordClassFormatted}\n\n${definitionsFitted}`,
				color: constants.colors.husky,
			});
		}
	}

	if (entry.expressions !== undefined && entry.expressions.length !== 0) {
		const expressionsStringified = stringifyEntries(entry.expressions, 'expressions', BulletStyles.Arrow);
		const expressionsFitted = fitTextToFieldSize(client, expressionsStringified, locale, verbose);

		const strings = {
			expressions: localise(client, 'word.strings.fields.expressions', locale)(),
		};

		if (!verbose) {
			fields.push({ name: strings.expressions, value: expressionsFitted });
		} else {
			embeds.push({ title: strings.expressions, description: expressionsFitted, color: constants.colors.husky });
		}
	}

	if (entry.etymologies !== undefined && entry.etymologies.length !== 0) {
		const etymology = entry.etymologies.map((etymology) => {
			if (etymology.tags === undefined) {
				return `**${etymology.value}**`;
			}

			if (etymology.value === undefined) {
				return tagsToString(etymology.tags);
			}

			return `${tagsToString(etymology.tags)} **${etymology.value}**`;
		}).join('\n');

		const strings = {
			etymology: localise(client, 'word.strings.fields.etymology', locale)(),
		};

		if (!verbose) {
			fields.push({ name: strings.etymology, value: etymology });
		} else {
			embeds.push({ title: strings.etymology, description: etymology, color: constants.colors.husky });
		}
	}

	if (!verbose) {
		return [{ title: word, description: wordClassFormatted, fields, color: constants.colors.husky }];
	}

	return embeds;
}

function tagsToString(tags: string[]): string {
	return tags.map((tag) => code(tag)).join(' ');
}

type EntryType = 'definitions' | 'expressions';

function isDefinition(_entry: Definition | Expression, entryType: EntryType): _entry is Definition {
	return entryType === 'definitions';
}

function stringifyEntries<
	T extends EntryType,
	E extends Definition[] | Expression[] = T extends 'definitions' ? Definition[] : Expression[],
>(entries: E, entryType: T, bulletStyle: BulletStyles, depth = 0): string[] {
	const entriesStringified = entries.map((entry) => {
		const root = entry.tags === undefined ? entry.value : `${tagsToString(entry.tags)} ${entry.value}`;

		if (
			isDefinition(entry, entryType) && entry.value.endsWith(':') && entry.definitions !== undefined
		) {
			const entriesStringified = stringifyEntries(entry.definitions!, 'definitions', bulletStyle, depth + 1).join('\n');
			return `${root}\n${entriesStringified}`;
		}

		return root;
	});
	const entriesEnlisted = list(entriesStringified, bulletStyle);
	const entriesDelisted = entriesEnlisted.split('\n').map((entry) =>
		`${constants.symbols.meta.whitespace.repeat(depth * 2)}${entry}`
	);

	return entriesDelisted;
}

function fitTextToFieldSize(
	client: Client,
	textParts: string[],
	locale: string | undefined,
	verbose: boolean,
): string {
	const strings = {
		definitionsOmitted: localise(client, 'word.strings.definitionsOmitted', locale),
	};

	const characterOverhead = strings.definitionsOmitted({ 'number': textParts.length }).length + 20;

	const maxCharacterCount = verbose ? 4096 : 1024;

	let characterCount = 0;
	const stringsToDisplay: string[] = [];
	for (const [string, index] of textParts.map<[string, number]>((s, i) => [s, i])) {
		characterCount += string.length;

		if (characterCount + (index + 1 === textParts.length ? 0 : characterOverhead) >= maxCharacterCount) break;

		stringsToDisplay.push(string);
	}

	const stringsOmitted = textParts.length - stringsToDisplay.length;

	let fittedString = stringsToDisplay.join('\n');
	if (stringsOmitted !== 0) {
		fittedString += `\n\n*${strings.definitionsOmitted({ 'number': stringsOmitted })}*`;
	}

	return fittedString;
}

export default command;
export type { WordClass };
