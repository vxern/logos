import { isLocalisationLanguage } from "logos:constants/languages";
import { type PartOfSpeech, isUnknownPartOfSpeech } from "logos:constants/parts-of-speech";
import { code, trim } from "logos:core/formatting";
import type { Definition, DictionaryEntry, Expression } from "logos/adapters/dictionaries/adapter";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { WordSourceNotice } from "logos/commands/components/source-notices/word-source-notice.ts";
import { autocompleteLanguage } from "logos/commands/fragments/autocomplete/language.ts";

async function handleFindWordAutocomplete(
	client: Client,
	interaction: Logos.Interaction<any, { language: string | undefined }>,
): Promise<void> {
	await autocompleteLanguage(client, interaction);
}

/** Allows the user to look up a word and get information about it. */
async function handleFindWord(
	client: Client,
	interaction: Logos.Interaction<any, { word: string; language: string | undefined; verbose: boolean | undefined }>,
): Promise<void> {
	if (interaction.parameters.language !== undefined && !isLocalisationLanguage(interaction.parameters.language)) {
		const strings = constants.contexts.invalidLanguage({ localise: client.localise, locale: interaction.locale });
		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.red,
				},
			],
		});
		return;
	}

	const learningLanguage =
		interaction.parameters.language !== undefined ? interaction.parameters.language : interaction.learningLanguage;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const dictionaries = client.adapters.dictionaries.getAdapters({ learningLanguage });
	if (dictionaries === undefined) {
		const strings = constants.contexts.noDictionaryAdapters({
			localise: client.localise,
			locale: interaction.locale,
		});
		await client.reply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colours.dullYellow,
				},
			],
		});
		return;
	}

	await client.postponeReply(interaction, { visible: interaction.parameters.show });

	client.log.info(
		`Looking up the word '${interaction.parameters.word}' from ${
			dictionaries.length
		} dictionaries as requested by ${client.diagnostics.user(interaction.user)} on ${guild.name}...`,
	);

	const unclassifiedEntries: DictionaryEntry[] = [];
	const entriesByPartOfSpeech = new Map<PartOfSpeech, DictionaryEntry[]>();
	let searchesCompleted = 0;
	for (const dictionary of dictionaries) {
		if (dictionary.isFallback && searchesCompleted !== 0) {
			continue;
		}

		const entries = await dictionary.getEntries(interaction, interaction.parameters.word, learningLanguage);
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

			for (const index of new Array(entries).keys()) {
				const existingEntry = existingEntries[index];
				const entry = entries[index];
				if (entry === undefined) {
					throw new Error(
						`Entry at index ${index} for part of speech ${partOfSpeech} unexpectedly undefined.`,
					);
				}

				if (existingEntry === undefined) {
					existingEntries[index] = entry;
					continue;
				}

				existingEntries[index] = {
					...existingEntry,
					...entry,
					sources: [...existingEntry.sources, ...entry.sources],
				};
			}
		}

		searchesCompleted++;
	}

	if (entriesByPartOfSpeech.size === 0) {
		const strings = constants.contexts.noResults({ localise: client.localise, locale: interaction.displayLocale });
		await client.editReply(interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description({ word: interaction.parameters.word }),
					color: constants.colours.dullYellow,
				},
			],
		});

		setTimeout(
			() =>
				client.deleteReply(interaction).catch(() => {
					client.log.warn(`Failed to delete "no results for word" message.`);
				}),
			defaults.WARN_MESSAGE_DELETE_TIMEOUT,
		);

		return;
	}

	const entries = sanitiseEntries([...Array.from(entriesByPartOfSpeech.values()).flat(), ...unclassifiedEntries]);

	const showButton = interaction.parameters.show
		? undefined
		: client.interactionRepetitionService.getShowButton(interaction);

	await displayMenu(client, interaction, {
		entries,
		currentView: ContentTabs.Definitions,
		dictionaryEntryIndex: 0,
		inflectionTableIndex: 0,
		showButton,
		verbose: interaction.parameters.verbose ?? false,
	});
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
	showButton: Discord.ButtonComponent | undefined;
	currentView: ContentTabs;
	dictionaryEntryIndex: number;
	inflectionTableIndex: number;
	verbose: boolean;
}

async function displayMenu(client: Client, interaction: Logos.Interaction, data: WordViewData): Promise<void> {
	const entry = data.entries.at(data.dictionaryEntryIndex);
	if (entry === undefined) {
		return;
	}

	await client.editReply(interaction, {
		embeds: generateEmbeds(client, interaction, data, entry),
		components: await generateButtons(client, interaction, data, entry),
	});
}

function generateEmbeds(
	client: Client,
	interaction: Logos.Interaction,
	data: WordViewData,
	entry: DictionaryEntry,
): Discord.CamelizedDiscordEmbed[] {
	switch (data.currentView) {
		case ContentTabs.Definitions: {
			return entryToEmbeds(client, interaction, entry, data.verbose);
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

async function generateButtons(
	client: Client,
	interaction: Logos.Interaction,
	data: WordViewData,
	entry: DictionaryEntry,
): Promise<Discord.MessageComponents> {
	const paginationControls: Discord.ButtonComponent[][] = [];

	switch (data.currentView) {
		case ContentTabs.Definitions: {
			const isFirst = data.dictionaryEntryIndex === 0;
			const isLast = data.dictionaryEntryIndex === data.entries.length - 1;

			if (isFirst && isLast) {
				break;
			}

			const previousPageButton = new InteractionCollector(client, {
				only: interaction.parameters.show ? [interaction.user.id] : undefined,
			});

			const nextPageButton = new InteractionCollector(client, {
				only: interaction.parameters.show ? [interaction.user.id] : undefined,
			});

			previousPageButton.onInteraction(async (buttonPress) => {
				await client.acknowledge(buttonPress);

				if (!isFirst) {
					data.dictionaryEntryIndex--;
				}

				await displayMenu(client, interaction, data);
			});

			nextPageButton.onInteraction(async (buttonPress) => {
				await client.acknowledge(buttonPress);

				if (!isLast) {
					data.dictionaryEntryIndex++;
				}

				await displayMenu(client, interaction, data);
			});

			await client.registerInteractionCollector(previousPageButton);
			await client.registerInteractionCollector(nextPageButton);

			const strings = constants.contexts.wordPage({
				localise: client.localise,
				locale: interaction.displayLocale,
			});
			paginationControls.push([
				{
					type: Discord.MessageComponentTypes.Button,
					label: constants.emojis.interactions.menu.controls.back,
					customId: previousPageButton.customId,
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
					label: constants.emojis.interactions.menu.controls.forward,
					customId: nextPageButton.customId,
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

			const rows = entry.inflectionTable.toChunked(5).reverse();

			const button = new InteractionCollector<MenuButtonID>(client, {
				only: interaction.parameters.show ? [interaction.user.id] : undefined,
			});

			button.onInteraction(async (buttonPress) => {
				await client.acknowledge(buttonPress);

				if (entry.inflectionTable === undefined) {
					await displayMenu(client, interaction, data);
					return;
				}

				const customId = buttonPress.data?.customId;
				if (customId === undefined) {
					return;
				}

				const [_, indexString] = InteractionCollector.decodeId<MenuButtonID>(customId);
				const index = Number(indexString);

				if (index >= 0 && index <= entry.inflectionTable?.length) {
					data.inflectionTableIndex = index;
				}

				await displayMenu(client, interaction, data);
			});

			await client.registerInteractionCollector(button);

			for (const [row, rowIndex] of rows.map<[typeof entry.inflectionTable, number]>((r, i) => [r, i])) {
				const buttons = row.map<Discord.ButtonComponent>((table, index) => {
					const index_ = rowIndex * 5 + index;

					return {
						type: Discord.MessageComponentTypes.Button,
						label: table.title,
						customId: button.encodeId([index_.toString()]),
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

	const definitionsMenuButton = new InteractionCollector(client, {
		only: interaction.parameters.show ? [interaction.user.id] : undefined,
	});

	const inflectionMenuButton = new InteractionCollector(client, {
		only: interaction.parameters.show ? [interaction.user.id] : undefined,
	});

	definitionsMenuButton.onInteraction(async (buttonPress) => {
		await client.acknowledge(buttonPress);

		data.inflectionTableIndex = 0;
		data.currentView = ContentTabs.Definitions;

		await displayMenu(client, interaction, data);
	});

	inflectionMenuButton.onInteraction(async (buttonPress) => {
		await client.acknowledge(buttonPress);

		data.currentView = ContentTabs.Inflection;

		await displayMenu(client, interaction, data);
	});

	await client.registerInteractionCollector(definitionsMenuButton);
	await client.registerInteractionCollector(inflectionMenuButton);

	if (entry.definitions !== undefined) {
		const strings = constants.contexts.definitionsView({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		row.push({
			type: Discord.MessageComponentTypes.Button,
			label: strings.definitions,
			disabled: data.currentView === ContentTabs.Definitions,
			customId: definitionsMenuButton.customId,
			style: Discord.ButtonStyles.Primary,
		});
	}

	if (entry.inflectionTable !== undefined) {
		const strings = constants.contexts.inflectionView({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		row.push({
			type: Discord.MessageComponentTypes.Button,
			label: strings.inflection,
			disabled: data.currentView === ContentTabs.Inflection,
			customId: inflectionMenuButton.customId,
			style: Discord.ButtonStyles.Primary,
		});
	}

	if (data.showButton !== undefined) {
		row.push(data.showButton);
	}

	const sourceNotice = new WordSourceNotice(client, {
		interaction,
		sources: entry.sources.map(([link, licence]) => `[${licence.name}](${link})`),
	});

	await sourceNotice.register();

	row.push(sourceNotice.button);

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
	interaction: Logos.Interaction,
	entry: DictionaryEntry,
	verbose: boolean,
): Discord.CamelizedDiscordEmbed[] {
	let partOfSpeechDisplayed: string;
	if (entry.partOfSpeech === undefined) {
		const strings = constants.contexts.partOfSpeechUnknown({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		partOfSpeechDisplayed = strings.unknown;
	} else {
		const [detected, original] = entry.partOfSpeech;

		if (detected === "unknown") {
			partOfSpeechDisplayed = original;
		} else {
			const strings = constants.contexts.partOfSpeech({
				localise: client.localise,
				locale: interaction.displayLocale,
			});
			partOfSpeechDisplayed = strings.partOfSpeech(detected);
			if (isUnknownPartOfSpeech(detected)) {
				partOfSpeechDisplayed += ` — '${original}'`;
			}
		}
	}
	const partOfSpeechFormatted = `***${partOfSpeechDisplayed}***`;

	const word = entry.lemma;

	const embeds: Discord.CamelizedDiscordEmbed[] = [];
	const fields: Discord.CamelizedDiscordEmbedField[] = [];

	if (entry.nativeDefinitions !== undefined && entry.nativeDefinitions.length > 0) {
		const definitionsStringified = stringifyEntries(client, interaction, entry.nativeDefinitions, "definitions");
		const definitionsFitted = fitTextToFieldSize(client, interaction, definitionsStringified, verbose);

		if (verbose) {
			const strings = constants.contexts.nativeDefinitionsForWord({
				localise: client.localise,
				locale: interaction.displayLocale,
			});
			embeds.push({
				title: `${constants.emojis.word.definitions} ${strings.nativeDefinitionsForWord({ word })}`,
				description: `${partOfSpeechFormatted}\n\n${definitionsFitted}`,
				color: constants.colours.husky,
			});
		} else {
			const strings = constants.contexts.nativeDefinitions({
				localise: client.localise,
				locale: interaction.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.word.definitions} ${strings.nativeDefinitions}`,
				value: definitionsFitted,
			});
		}
	}

	if (entry.definitions !== undefined && entry.definitions.length > 0) {
		const definitionsStringified = stringifyEntries(client, interaction, entry.definitions, "definitions");
		const definitionsFitted = fitTextToFieldSize(client, interaction, definitionsStringified, verbose);

		if (verbose) {
			const strings = constants.contexts.definitionsForWord({
				localise: client.localise,
				locale: interaction.displayLocale,
			});
			embeds.push({
				title: `${constants.emojis.word.definitions} ${strings.definitionsForWord({ word })}`,
				description: `${partOfSpeechFormatted}\n\n${definitionsFitted}`,
				color: constants.colours.husky,
			});
		} else {
			const strings = constants.contexts.definitions({
				localise: client.localise,
				locale: interaction.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.word.definitions} ${strings.definitions}`,
				value: definitionsFitted,
			});
		}
	}

	if (entry.expressions !== undefined && entry.expressions.length > 0) {
		const expressionsStringified = stringifyEntries(client, interaction, entry.expressions, "expressions");
		const expressionsFitted = fitTextToFieldSize(client, interaction, expressionsStringified, verbose);

		const strings = constants.contexts.expressions({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		if (verbose) {
			embeds.push({
				title: `${constants.emojis.word.expressions} ${strings.expressions}`,
				description: expressionsFitted,
				color: constants.colours.husky,
			});
		} else {
			fields.push({
				name: `${constants.emojis.word.expressions} ${strings.expressions}`,
				value: trim(expressionsFitted, 1024),
			});
		}
	}

	if (entry.etymologies !== undefined && entry.etymologies.length > 0) {
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

		const strings = constants.contexts.etymology({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		if (verbose) {
			embeds.push({
				title: `${constants.emojis.word.etymology} ${strings.etymology}`,
				description: etymology,
				color: constants.colours.husky,
			});
		} else {
			fields.push({
				name: `${constants.emojis.word.etymology} ${strings.etymology}`,
				value: trim(etymology, 1024),
			});
		}
	}

	if (!verbose) {
		return [
			{
				title: `${constants.emojis.word.word} ${word}`,
				description: partOfSpeechFormatted,
				fields,
				color: constants.colours.husky,
			},
		];
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

const parenthesesExpression = /\((.+?)\)/g;

function stringifyEntries<
	T extends EntryType,
	E extends Definition[] | Expression[] = T extends "definitions" ? Definition[] : Expression[],
>(
	client: Client,
	interaction: Logos.Interaction,
	entries: E,
	entryType: T,
	options?: { root: string; depth: number },
): string[] {
	const entriesStringified = entries.map((entry, indexZeroBased) => {
		const parenthesesContents: string[] = [];
		for (const [match, contents] of entry.value.matchAll(parenthesesExpression)) {
			if (contents === undefined) {
				throw new Error(
					`'${match}' was matched to the parentheses regular expression, but the contents were \`undefined\`.`,
				);
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

		let anchor = entry.tags === undefined ? value : `${tagsToString(entry.tags)} ${value}`;
		if (isDefinition(entry, entryType)) {
			if (entry.relations !== undefined) {
				const strings = constants.contexts.wordRelations({
					localise: client.localise,
					locale: interaction.displayLocale,
				});

				const synonyms = entry.relations.synonyms ?? [];
				const antonyms = entry.relations.antonyms ?? [];
				const diminutives = entry.relations.diminutives ?? [];
				const augmentatives = entry.relations.augmentatives ?? [];

				if (synonyms.length > 0 || antonyms.length > 0) {
					anchor += "\n  - ";
					const columns: string[] = [];

					if (synonyms.length > 0) {
						columns.push(`**${strings.synonyms}**: ${synonyms.join(", ")}`);
					}

					if (antonyms.length > 0) {
						columns.push(`**${strings.antonyms}**: ${antonyms.join(", ")}`);
					}

					anchor += columns.join(` ${constants.special.divider} `);
				}

				if (diminutives.length > 0 || augmentatives.length > 0) {
					anchor += "\n  - ";
					const columns: string[] = [];

					if (diminutives.length > 0) {
						columns.push(`**${strings.diminutives}**: ${diminutives.join(", ")}`);
					}

					if (augmentatives.length > 0) {
						columns.push(`**${strings.augmentatives}**: ${augmentatives.join(", ")}`);
					}

					anchor += columns.join(` ${constants.special.divider} `);
				}
			}

			if (value.endsWith(":")) {
				const definitions = entry.definitions ?? [];
				if (definitions.length === 0) {
					return anchor;
				}

				const index = indexZeroBased + 1;
				const newRoot = options === undefined ? `${index}` : `${options.root}.${index}`;
				const entriesStringified = stringifyEntries(client, interaction, definitions, "definitions", {
					root: newRoot,
					depth: (options?.depth ?? 0) + 1,
				}).join("\n");
				return `${anchor}\n${entriesStringified}`;
			}
		}

		return anchor;
	});

	const entriesEnlisted = entriesStringified
		.map((entry, indexZeroBased) => {
			const index = indexZeroBased + 1;

			if (options === undefined) {
				return `${index}. ${entry}`;
			}

			return `${options.root}.${index}. ${entry}`;
		})
		.join("\n");

	return entriesEnlisted
		.split("\n")
		.map((entry) => `${constants.special.meta.whitespace.repeat((options?.depth ?? 0) * 2)}${entry}`);
}

function fitTextToFieldSize(
	client: Client,
	interaction: Logos.Interaction,
	textParts: string[],
	verbose: boolean,
): string {
	const strings = constants.contexts.definitionsOmitted({
		localise: client.localise,
		locale: interaction.displayLocale,
	});
	const characterOverhead =
		strings.definitionsOmitted({
			definitions: client.pluralise("word.strings.definitionsOmitted.definitions", interaction.displayLocale, {
				quantity: textParts.length,
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
			definitions: client.pluralise("word.strings.definitionsOmitted.definitions", interaction.displayLocale, {
				quantity: stringsOmitted,
			}),
			flag: "verbose",
		})}*`;
	}

	return fittedString;
}

export { handleFindWord, handleFindWordAutocomplete };
