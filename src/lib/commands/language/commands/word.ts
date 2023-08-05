import constants from "../../../../constants/constants";
import { Locale, LocalisationLanguage } from "../../../../constants/language";
import defaults from "../../../../defaults";
import { code } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise, pluralise } from "../../../client";
import diagnostics from "../../../diagnostics";
import {
	acknowledge,
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	encodeId,
	parseArguments,
	postponeReply,
	reply,
} from "../../../interactions";
import { chunk } from "../../../utils";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import { Definition, DictionaryEntry, Expression } from "../dictionaries/adapter";
import { PartOfSpeech, isUnknownPartOfSpeech, partOfSpeechToStringKey } from "../dictionaries/parts-of-speech";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "word",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isRateLimited: true,
	handle: handleFindWord,
	options: [
		{
			name: "word",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
		},
		{
			name: "verbose",
			type: Discord.ApplicationCommandOptionTypes.Boolean,
		},
		show,
	],
};

/** Allows the user to look up a word and get information about it. */
async function handleFindWord([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const [{ word, verbose, show }] = parseArguments(interaction.data?.options, {
		verbose: "boolean",
		show: "boolean",
	});
	if (word === undefined) {
		return;
	}

	const language = show ? interaction.guildLanguage : interaction.language;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetch(client, "id", guildId.toString());
	if (guildDocument === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const dictionaries = client.features.dictionaryAdapters.get(interaction.featureLanguage);
	if (dictionaries === undefined) {
		const strings = {
			title: localise(client, "word.strings.noDictionaryAdapters.title", locale)(),
			description: localise(client, "word.strings.noDictionaryAdapters.description", locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	await postponeReply([client, bot], interaction, { visible: show });

	client.log.info(
		`Looking up the word '${word}' from ${dictionaries.length} dictionaries as requested by ${diagnostics.display.user(
			interaction.user,
		)} on ${guild.name}...`,
	);

	const unclassifiedEntries: DictionaryEntry[] = [];
	const entriesByPartOfSpeech = new Map<PartOfSpeech, DictionaryEntry[]>();
	for (const dictionary of dictionaries) {
		const entries = await dictionary.getEntries(word, interaction.featureLanguage, client, { locale });
		if (entries === undefined) {
			continue;
		}

		const organised = new Map<PartOfSpeech, DictionaryEntry[]>();
		for (const entry of entries) {
			const [partOfSpeech, _] = entry.partOfSpeech;
			if (partOfSpeech === "unknown") {
				unclassifiedEntries.push(entry);
				continue;
			}

			if (!organised.has(partOfSpeech)) {
				organised.set(partOfSpeech, [entry]);
				continue;
			}

			organised.get(partOfSpeech)?.push(entry);
		}

		for (const [partOfSpeech, entries] of organised.entries()) {
			if (!entriesByPartOfSpeech.has(partOfSpeech)) {
				entriesByPartOfSpeech.set(partOfSpeech, entries);
				continue;
			}

			const existingEntries = entriesByPartOfSpeech.get(partOfSpeech) ?? entries;

			for (const index of Array(entries).keys()) {
				const existingEntry = existingEntries[index];
				const entry = entries[index];
				if (entry === undefined) {
					throw `StateError: Entry at index ${index} for part of speech ${partOfSpeech} unexpectedly undefined.`;
				}

				if (existingEntry === undefined) {
					existingEntries[index] = entry;
					continue;
				}

				existingEntries[index] = { ...existingEntry, ...entry };
			}
		}
	}

	if (entriesByPartOfSpeech.size === 0) {
		const strings = {
			title: localise(client, "word.strings.noResults.title", locale)(),
			description: localise(
				client,
				"word.strings.noResults.description",
				locale,
			)({
				word: word,
			}),
		};

		await editReply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});

		setTimeout(
			() =>
				deleteReply([client, bot], interaction).catch(() => {
					client.log.warn(`Failed to delete "no results for word" message.`);
				}),
			defaults.WARN_MESSAGE_DELETE_TIMEOUT,
		);

		return;
	}

	const entries = sanitiseEntries([...Array.from(entriesByPartOfSpeech.values()).flat(), ...unclassifiedEntries]);

	displayMenu(
		[client, bot],
		interaction,
		{
			entries,
			currentView: ContentTabs.Definitions,
			dictionaryEntryIndex: 0,
			inflectionTableIndex: 0,
			verbose: verbose ?? false,
		},
		{ language, locale },
	);
}

function sanitiseEntries(entries: DictionaryEntry[]): DictionaryEntry[] {
	for (const entry of entries) {
		for (const etymology of entry.etymologies ?? []) {
			etymology.value = etymology.value?.replaceAll("*", "\\*");
		}
	}
	return entries;
}

enum ContentTabs {
	Definitions = 0,
	Inflection = 1,
}

interface WordViewData {
	readonly entries: DictionaryEntry[];
	currentView: ContentTabs;
	dictionaryEntryIndex: number;
	inflectionTableIndex: number;
	verbose: boolean;
}

async function displayMenu(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	data: WordViewData,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): Promise<void> {
	const entry = data.entries.at(data.dictionaryEntryIndex);
	if (entry === undefined) {
		return;
	}

	editReply([client, bot], interaction, {
		embeds: generateEmbeds(client, data, entry, { language, locale }),
		components: generateButtons([client, bot], interaction, data, entry, { language, locale }),
	});
}

function generateEmbeds(
	client: Client,
	data: WordViewData,
	entry: DictionaryEntry,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): Discord.Embed[] {
	switch (data.currentView) {
		case ContentTabs.Definitions: {
			return entryToEmbeds(client, entry, data.verbose, { language, locale });
		}
		case ContentTabs.Inflection: {
			const inflectionTable = entry.inflectionTable?.at(data.inflectionTableIndex);
			if (inflectionTable === undefined) {
				return [];
			}

			return [inflectionTable];
		}
	}
}

type MenuButtonID = [index: string];

function generateButtons(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	data: WordViewData,
	entry: DictionaryEntry,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): Discord.MessageComponents {
	const paginationControls: Discord.ButtonComponent[][] = [];

	switch (data.currentView) {
		case ContentTabs.Definitions: {
			const isFirst = data.dictionaryEntryIndex === 0;
			const isLast = data.dictionaryEntryIndex === data.entries.length - 1;

			if (isFirst && isLast) {
				break;
			}

			const previousPageButtonId = createInteractionCollector([client, bot], {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (_, selection) => {
					acknowledge([client, bot], selection);

					if (!isFirst) {
						data.dictionaryEntryIndex--;
					}

					displayMenu([client, bot], interaction, data, { language, locale });
				},
			});

			const nextPageButtonId = createInteractionCollector([client, bot], {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (_, selection) => {
					acknowledge([client, bot], selection);

					if (!isLast) {
						data.dictionaryEntryIndex++;
					}

					displayMenu([client, bot], interaction, data, { language, locale });
				},
			});

			const strings = {
				page: localise(client, "word.strings.page", locale)(),
			};

			paginationControls.push([
				{
					type: Discord.MessageComponentTypes.Button,
					label: constants.symbols.interactions.menu.controls.back,
					customId: previousPageButtonId,
					style: Discord.ButtonStyles.Secondary,
					disabled: isFirst,
				},
				{
					type: Discord.MessageComponentTypes.Button,
					label: `${strings.page} ${data.dictionaryEntryIndex + 1}/${data.entries.length}`,
					style: Discord.ButtonStyles.Secondary,
					customId: constants.components.none,
				},
				{
					type: Discord.MessageComponentTypes.Button,
					label: constants.symbols.interactions.menu.controls.forward,
					customId: nextPageButtonId,
					style: Discord.ButtonStyles.Secondary,
					disabled: isLast,
				},
			]);

			break;
		}
		case ContentTabs.Inflection: {
			if (entry.inflectionTable === undefined) {
				return [];
			}

			const rows = chunk(entry.inflectionTable, 5).reverse();

			const buttonId = createInteractionCollector([client, bot], {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (_, selection) => {
					acknowledge([client, bot], selection);

					if (entry.inflectionTable === undefined || selection.data === undefined) {
						displayMenu([client, bot], interaction, data, { language, locale });
						return;
					}

					const customId = selection.data?.customId;
					if (customId === undefined) {
						return;
					}

					const [__, indexString] = decodeId<MenuButtonID>(customId);
					const index = Number(indexString);

					if (index >= 0 && index <= entry.inflectionTable?.length) {
						data.inflectionTableIndex = index;
					}

					displayMenu([client, bot], interaction, data, { language, locale });
				},
			});

			for (const [row, rowIndex] of rows.map<[typeof entry.inflectionTable, number]>((r, i) => [r, i])) {
				const buttons = row.map<Discord.ButtonComponent>((table, index) => {
					const index_ = rowIndex * 5 + index;

					return {
						type: Discord.MessageComponentTypes.Button,
						label: table.title,
						customId: encodeId<MenuButtonID>(buttonId, [index_.toString()]),
						disabled: data.inflectionTableIndex === index_,
						style: Discord.ButtonStyles.Secondary,
					};
				});

				if (buttons.length > 1) {
					paginationControls.unshift(buttons);
				}
			}
		}
	}

	const row: Discord.ButtonComponent[] = [];

	const definitionsMenuButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		onCollect: async (_, selection) => {
			acknowledge([client, bot], selection);

			data.inflectionTableIndex = 0;
			data.currentView = ContentTabs.Definitions;

			displayMenu([client, bot], interaction, data, { language, locale });
		},
	});

	const inflectionMenuButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		onCollect: async (_, selection) => {
			acknowledge([client, bot], selection);

			data.currentView = ContentTabs.Inflection;

			displayMenu([client, bot], interaction, data, { language, locale });
		},
	});

	if (entry.definitions !== undefined) {
		const strings = {
			definitions: localise(client, "word.strings.definitions", locale)(),
		};

		row.push({
			type: Discord.MessageComponentTypes.Button,
			label: strings.definitions,
			disabled: data.currentView === ContentTabs.Definitions,
			customId: definitionsMenuButtonId,
			style: Discord.ButtonStyles.Primary,
		});
	}

	if (entry.inflectionTable !== undefined) {
		const strings = {
			inflection: localise(client, "word.strings.inflection", locale)(),
		};

		row.push({
			type: Discord.MessageComponentTypes.Button,
			label: strings.inflection,
			disabled: data.currentView === ContentTabs.Inflection,
			customId: inflectionMenuButtonId,
			style: Discord.ButtonStyles.Primary,
		});
	}

	if (row.length > 1) {
		paginationControls.push(row);
	}

	return paginationControls.map((row) => ({
		type: Discord.MessageComponentTypes.ActionRow,
		components: row as [Discord.ButtonComponent],
	}));
}

function entryToEmbeds(
	client: Client,
	entry: DictionaryEntry,
	verbose: boolean,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): Discord.Embed[] {
	let partOfSpeechDisplayed: string;
	if (entry.partOfSpeech === undefined) {
		const strings = {
			unknown: localise(client, "words.unknown", locale)(),
		};

		partOfSpeechDisplayed = strings.unknown;
	} else {
		const [detected, original] = entry.partOfSpeech;

		const strings = {
			partOfSpeech: localise(client, partOfSpeechToStringKey[detected], locale)(),
		};

		partOfSpeechDisplayed = strings.partOfSpeech;
		if (isUnknownPartOfSpeech(detected)) {
			partOfSpeechDisplayed += ` — '${original}'`;
		}
	}
	const partOfSpeechFormatted = `***${partOfSpeechDisplayed}***`;

	const word = entry.lemma;

	const embeds: Discord.Embed[] = [];
	const fields: NonNullable<Discord.Embed["fields"]> = [];

	if (entry.nativeDefinitions !== undefined && entry.nativeDefinitions.length !== 0) {
		const definitionsStringified = stringifyEntries(entry.nativeDefinitions, "definitions");
		const definitionsFitted = fitTextToFieldSize(client, definitionsStringified, verbose, { language, locale });

		if (verbose) {
			const strings = {
				nativeDefinitionsForWord: localise(client, "word.strings.nativeDefinitionsForWord", locale)({ word: word }),
			};

			embeds.push({
				title: strings.nativeDefinitionsForWord,
				description: `${partOfSpeechFormatted}\n\n${definitionsFitted}`,
				color: constants.colors.husky,
			});
		} else {
			const strings = {
				nativeDefinitions: localise(client, "word.strings.fields.nativeDefinitions", locale)(),
			};

			fields.push({
				name: strings.nativeDefinitions,
				value: definitionsFitted,
			});
		}
	}

	if (entry.definitions !== undefined && entry.definitions.length !== 0) {
		const definitionsStringified = stringifyEntries(entry.definitions, "definitions");
		const definitionsFitted = fitTextToFieldSize(client, definitionsStringified, verbose, { language, locale });

		if (verbose) {
			const strings = {
				definitionsForWord: localise(client, "word.strings.definitionsForWord", locale)({ word: word }),
			};

			embeds.push({
				title: strings.definitionsForWord,
				description: `${partOfSpeechFormatted}\n\n${definitionsFitted}`,
				color: constants.colors.husky,
			});
		} else {
			const strings = {
				definitions: localise(client, "word.strings.fields.definitions", locale)(),
			};

			fields.push({
				name: strings.definitions,
				value: definitionsFitted,
			});
		}
	}

	if (entry.expressions !== undefined && entry.expressions.length !== 0) {
		const expressionsStringified = stringifyEntries(entry.expressions, "expressions");
		const expressionsFitted = fitTextToFieldSize(client, expressionsStringified, verbose, { language, locale });

		const strings = {
			expressions: localise(client, "word.strings.fields.expressions", locale)(),
		};

		if (verbose) {
			embeds.push({ title: strings.expressions, description: expressionsFitted, color: constants.colors.husky });
		} else {
			fields.push({ name: strings.expressions, value: expressionsFitted });
		}
	}

	if (entry.etymologies !== undefined && entry.etymologies.length !== 0) {
		const etymology = entry.etymologies
			.map((etymology) => {
				if (etymology.tags === undefined) {
					return etymology.value;
				}

				if (etymology.value === undefined || etymology.value.length === 0) {
					return tagsToString(etymology.tags);
				}

				return `${tagsToString(etymology.tags)} ${etymology.value}`;
			})
			.join("\n");

		const strings = {
			etymology: localise(client, "word.strings.fields.etymology", locale)(),
		};

		if (verbose) {
			embeds.push({ title: strings.etymology, description: etymology, color: constants.colors.husky });
		} else {
			fields.push({ name: strings.etymology, value: etymology });
		}
	}

	if (!verbose) {
		return [{ title: word, description: partOfSpeechFormatted, fields, color: constants.colors.husky }];
	}

	return embeds;
}

function tagsToString(tags: string[]): string {
	return tags.map((tag) => code(tag)).join(" ");
}

type EntryType = "definitions" | "expressions";

function isDefinition(_entry: Definition | Expression, entryType: EntryType): _entry is Definition {
	return entryType === "definitions";
}

const parenthesesExpression = RegExp("\\((.+?)\\)", "g");

function stringifyEntries<
	T extends EntryType,
	E extends Definition[] | Expression[] = T extends "definitions" ? Definition[] : Expression[],
>(entries: E, entryType: T, root?: string, depth = 0): string[] {
	const entriesStringified = entries.map((entry, indexZeroBased) => {
		const parenthesesContents: string[] = [];
		for (const [match, contents] of entry.value.matchAll(parenthesesExpression)) {
			if (contents === undefined) {
				throw `StateError: '${match}' was matched to the parentheses regular expression, but the contents were \`undefined\`.`;
			}

			if (parenthesesContents.includes(contents)) {
				continue;
			}

			parenthesesContents.push(contents);
		}

		const value = parenthesesContents.reduce(
			(string, match) => string.replace(`(${match})`, `(*${match}*)`),
			entry.value,
		);

		const anchor = entry.tags === undefined ? value : `${tagsToString(entry.tags)} ${value}`;

		if (isDefinition(entry, entryType) && value.endsWith(":")) {
			const definitions = entry.definitions;
			if (definitions === undefined) {
				throw "StateError: Definitions were unexpectedly `undefined`.";
			}

			const index = indexZeroBased + 1;
			const newRoot = root === undefined ? `${index}` : `${root}.${index}`;
			const entriesStringified = stringifyEntries(definitions, "definitions", newRoot, depth + 1).join("\n");
			return `${anchor}\n${entriesStringified}`;
		}

		return anchor;
	});

	const entriesEnlisted = entriesStringified
		.map((entry, indexZeroBased) => {
			const index = indexZeroBased + 1;

			if (root === undefined) {
				return `${index}. ${entry}`;
			}

			return `${root}.${index}. ${entry}`;
		})
		.join("\n");
	const entriesDelisted = entriesEnlisted
		.split("\n")
		.map((entry) => `${constants.symbols.meta.whitespace.repeat(depth * 2)}${entry}`);

	return entriesDelisted;
}

function fitTextToFieldSize(
	client: Client,
	textParts: string[],
	verbose: boolean,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): string {
	const strings = {
		definitionsOmitted: localise(client, "word.strings.definitionsOmitted", locale),
	};

	const characterOverhead =
		strings.definitionsOmitted({
			definitions: localise(
				client,
				"word.strings.definitionsOmitted",
				locale,
			)({
				definitions: pluralise(client, "word.strings.definitionsOmitted.definitions", language, textParts.length),
			}),
			flag: "verbose",
		}).length + 20;

	const maxCharacterCount = verbose ? 2048 : 512;

	let characterCount = 0;
	const stringsToDisplay: string[] = [];
	for (const [string, index] of textParts.map<[string, number]>((s, i) => [s, i])) {
		characterCount += string.length;

		if (characterCount + (index + 1 === textParts.length ? 0 : characterOverhead) >= maxCharacterCount) {
			break;
		}

		stringsToDisplay.push(string);
	}

	const stringsOmitted = textParts.length - stringsToDisplay.length;

	let fittedString = stringsToDisplay.join("\n");
	if (stringsOmitted !== 0) {
		fittedString += `\n*${strings.definitionsOmitted({
			definitions: pluralise(client, "word.strings.definitionsOmitted.definitions", language, stringsOmitted),
			flag: "verbose",
		})}*`;
	}

	return fittedString;
}

export default command;
