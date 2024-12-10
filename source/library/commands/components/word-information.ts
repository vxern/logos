import type { DictionarySearchMode } from "logos:constants/dictionaries";
import { code, trim } from "logos:constants/formatting";
import { isUnknownPartOfSpeech } from "logos:constants/parts-of-speech";
import type { DefinitionField, DictionaryEntry, ExpressionField } from "logos/adapters/dictionaries/dictionary-entry";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { WordSourceNotice } from "logos/commands/components/source-notices/word-source-notice";

type InformationTab = "definitions" | "inflection";

type EntryType = "definitions" | "expressions";

type MenuButtonID = [index: string];

const parenthesesExpression = /\((.+?)\)/g;

class WordInformationComponent {
	readonly #client: Client;
	readonly #entries: DictionaryEntry[];
	readonly #showButton?: Discord.ButtonComponent;
	readonly #verbose: boolean;
	#anchor: Logos.Interaction;
	#tab: InformationTab;
	#dictionaryEntryIndex: number;
	#inflectionTableIndex: number;

	constructor(
		client: Client,
		{
			interaction,
			entries,
			searchMode,
		}: { interaction: Logos.Interaction; entries: DictionaryEntry[]; searchMode: DictionarySearchMode },
	) {
		this.#client = client;
		this.#entries = entries;
		if (interaction.parameters.show) {
			this.#showButton = client.services.global("interactionRepetition").getShowButton(interaction);
		}
		this.#verbose = interaction.parameters.verbose ?? false;

		this.#anchor = interaction;
		if (searchMode === "inflection") {
			this.#tab = "inflection";
		} else {
			this.#tab = "definitions";
		}
		this.#dictionaryEntryIndex = 0;
		this.#inflectionTableIndex = 0;
	}

	async display(): Promise<void> {
		const entry = this.#entries.at(this.#dictionaryEntryIndex);
		if (entry === undefined) {
			return;
		}

		this.#client
			.editReply(this.#anchor, {
				embeds: this.#generateEmbeds(entry),
				components: await this.#generateButtons(entry),
			})
			.ignore();
	}

	#generateEmbeds(entry: DictionaryEntry): Discord.Camelize<Discord.DiscordEmbed>[] {
		switch (this.#tab) {
			case "definitions": {
				return this.#entryToEmbeds(entry);
			}
			case "inflection": {
				const inflectionTable = entry.inflection?.tabs?.at(this.#inflectionTableIndex);
				if (inflectionTable === undefined) {
					return [];
				}

				return [inflectionTable];
			}
		}
	}

	async #generateButtons(entry: DictionaryEntry): Promise<Discord.MessageComponents> {
		const paginationControls: Discord.ButtonComponent[][] = [];

		switch (this.#tab) {
			case "definitions": {
				const isFirst = this.#dictionaryEntryIndex === 0;
				const isLast = this.#dictionaryEntryIndex === this.#entries.length - 1;

				if (isFirst && isLast) {
					break;
				}

				const previousPageButton = new InteractionCollector(this.#client, {
					only: this.#anchor.parameters.show ? [this.#anchor.user.id] : undefined,
				});

				const nextPageButton = new InteractionCollector(this.#client, {
					only: this.#anchor.parameters.show ? [this.#anchor.user.id] : undefined,
				});

				previousPageButton.onInteraction(async (buttonPress) => {
					this.#client.acknowledge(buttonPress).ignore();

					if (!isFirst) {
						this.#dictionaryEntryIndex -= 1;
					}

					await this.display();
				});

				nextPageButton.onInteraction(async (buttonPress) => {
					this.#client.acknowledge(buttonPress).ignore();

					if (!isLast) {
						this.#dictionaryEntryIndex += 1;
					}

					await this.display();
				});

				await this.#client.registerInteractionCollector(previousPageButton);
				await this.#client.registerInteractionCollector(nextPageButton);

				const strings = constants.contexts.wordPage({
					localise: this.#client.localise,
					locale: this.#anchor.displayLocale,
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
						label: `${strings.page} ${this.#dictionaryEntryIndex + 1}/${this.#entries.length}`,
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
			case "inflection": {
				if (entry.inflection === undefined) {
					return [];
				}

				const rows = entry.inflection.tabs.toChunked(5).reverse();

				const button = new InteractionCollector<MenuButtonID>(this.#client, {
					only: this.#anchor.parameters.show ? [this.#anchor.user.id] : undefined,
				});

				button.onInteraction(async (buttonPress) => {
					this.#client.acknowledge(buttonPress).ignore();

					if (entry.inflection === undefined) {
						await this.display();
						return;
					}

					const customId = buttonPress.data?.customId;
					if (customId === undefined) {
						return;
					}

					const [_, indexString] = InteractionCollector.decodeId<MenuButtonID>(customId);
					const index = Number(indexString);

					if (index >= 0 && index <= entry.inflection?.tabs?.length) {
						this.#inflectionTableIndex = index;
					}

					await this.display();
				});

				await this.#client.registerInteractionCollector(button);

				for (const [row, rowIndex] of rows.map<[typeof entry.inflection.tabs, number]>((r, i) => [r, i])) {
					const buttons = row.map<Discord.ButtonComponent>((table, index) => {
						const index_ = rowIndex * 5 + index;

						return {
							type: Discord.MessageComponentTypes.Button,
							label: table.title,
							customId: button.encodeId([index_.toString()]),
							disabled: this.#inflectionTableIndex === index_,
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

		if (entry.definitions !== undefined) {
			const definitionsMenuButton = new InteractionCollector(this.#client, {
				only: this.#anchor.parameters.show ? [this.#anchor.user.id] : undefined,
			});

			definitionsMenuButton.onInteraction(async (buttonPress) => {
				this.#client.acknowledge(buttonPress).ignore();

				this.#inflectionTableIndex = 0;
				this.#tab = "definitions";

				await this.display();
			});

			await this.#client.registerInteractionCollector(definitionsMenuButton);

			const strings = constants.contexts.definitionsView({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			row.push({
				type: Discord.MessageComponentTypes.Button,
				label: strings.definitions,
				disabled: this.#tab === "definitions",
				customId: definitionsMenuButton.customId,
				style: Discord.ButtonStyles.Primary,
			});
		}

		if (entry.inflection !== undefined) {
			const inflectionMenuButton = new InteractionCollector(this.#client, {
				only: this.#anchor.parameters.show ? [this.#anchor.user.id] : undefined,
			});

			inflectionMenuButton.onInteraction(async (buttonPress) => {
				this.#client.acknowledge(buttonPress).ignore();

				this.#tab = "inflection";

				await this.display();
			});

			await this.#client.registerInteractionCollector(inflectionMenuButton);

			const strings = constants.contexts.inflectionView({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			row.push({
				type: Discord.MessageComponentTypes.Button,
				label: strings.inflection,
				disabled: this.#tab === "inflection",
				customId: inflectionMenuButton.customId,
				style: Discord.ButtonStyles.Primary,
			});
		}

		if (row.length === 1) {
			row.pop();
		}

		if (this.#showButton !== undefined) {
			row.push(this.#showButton);
		}

		const sourceNotice = new WordSourceNotice(this.#client, {
			interaction: this.#anchor,
			sources: entry.sources.map(({ link, licence }) => `[${licence.name}](${link})`),
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

	#entryToEmbeds(entry: DictionaryEntry): Discord.Camelize<Discord.DiscordEmbed>[] {
		let partOfSpeechDisplayed: string;
		if (entry.partOfSpeech === undefined) {
			const strings = constants.contexts.partOfSpeechUnknown({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			partOfSpeechDisplayed = strings.unknown;
		} else {
			const partOfSpeech = entry.partOfSpeech.detected;
			if (partOfSpeech === "unknown") {
				partOfSpeechDisplayed = partOfSpeech;
			} else {
				const strings = constants.contexts.partOfSpeech({
					localise: this.#client.localise,
					locale: this.#anchor.displayLocale,
				});
				partOfSpeechDisplayed = strings.partOfSpeech(partOfSpeech);
				if (isUnknownPartOfSpeech(partOfSpeech)) {
					partOfSpeechDisplayed += ` — '${partOfSpeech}'`;
				}
			}
		}
		const partOfSpeechFormatted = `***${partOfSpeechDisplayed}***`;

		const word = entry.lemma.value;

		const embeds: Discord.Camelize<Discord.DiscordEmbed>[] = [];
		const fields: Discord.Camelize<Discord.DiscordEmbedField>[] = [];

		if (entry.definitions !== undefined && entry.definitions.length > 0) {
			const definitionsStringified = this.stringifyEntries(
				this.#client,
				this.#anchor,
				entry.definitions,
				"definitions",
			);
			const definitionsFitted = this.fitTextToFieldSize(
				this.#client,
				this.#anchor,
				definitionsStringified,
				this.#verbose,
			);

			if (this.#verbose) {
				const strings = constants.contexts.nativeDefinitionsForWord({
					localise: this.#client.localise,
					locale: this.#anchor.displayLocale,
				});
				embeds.push({
					title: `${constants.emojis.commands.word.definitions} ${strings.nativeDefinitionsForWord({ word })}`,
					description: `${partOfSpeechFormatted}\n\n${definitionsFitted}`,
					color: constants.colours.husky,
				});
			} else {
				const strings = constants.contexts.nativeDefinitions({
					localise: this.#client.localise,
					locale: this.#anchor.displayLocale,
				});
				fields.push({
					name: `${constants.emojis.commands.word.definitions} ${strings.nativeDefinitions}`,
					value: definitionsFitted,
				});
			}
		}

		if (entry.translations !== undefined && entry.translations.length > 0) {
			const definitionsStringified = this.stringifyEntries(
				this.#client,
				this.#anchor,
				entry.translations,
				"definitions",
			);
			const definitionsFitted = this.fitTextToFieldSize(
				this.#client,
				this.#anchor,
				definitionsStringified,
				this.#verbose,
			);

			if (this.#verbose) {
				const strings = constants.contexts.definitionsForWord({
					localise: this.#client.localise,
					locale: this.#anchor.displayLocale,
				});
				embeds.push({
					title: `${constants.emojis.commands.word.definitions} ${strings.definitionsForWord({ word })}`,
					description: `${partOfSpeechFormatted}\n\n${definitionsFitted}`,
					color: constants.colours.husky,
				});
			} else {
				const strings = constants.contexts.definitions({
					localise: this.#client.localise,
					locale: this.#anchor.displayLocale,
				});
				fields.push({
					name: `${constants.emojis.commands.word.definitions} ${strings.definitions}`,
					value: definitionsFitted,
				});
			}
		}

		if (entry.expressions !== undefined && entry.expressions.length > 0) {
			const expressionsStringified = this.stringifyEntries(
				this.#client,
				this.#anchor,
				entry.expressions,
				"expressions",
			);
			const expressionsFitted = this.fitTextToFieldSize(
				this.#client,
				this.#anchor,
				expressionsStringified,
				this.#verbose,
			);

			const strings = constants.contexts.expressions({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			if (this.#verbose) {
				embeds.push({
					title: `${constants.emojis.commands.word.expressions} ${strings.expressions}`,
					description: expressionsFitted,
					color: constants.colours.husky,
				});
			} else {
				fields.push({
					name: `${constants.emojis.commands.word.expressions} ${strings.expressions}`,
					value: trim(expressionsFitted, 1024),
				});
			}
		}

		if (entry.etymology !== undefined) {
			let etymology: string;
			if (entry.etymology.labels === undefined) {
				etymology = entry.etymology.value;
			} else if (entry.etymology.value === undefined || entry.etymology.value.length === 0) {
				etymology = this.tagsToString(entry.etymology.labels);
			} else {
				etymology = `${this.tagsToString(entry.etymology.labels)} ${entry.etymology.value}`;
			}

			const strings = constants.contexts.etymology({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			if (this.#verbose) {
				embeds.push({
					title: `${constants.emojis.commands.word.etymology} ${strings.etymology}`,
					description: etymology,
					color: constants.colours.husky,
				});
			} else {
				fields.push({
					name: `${constants.emojis.commands.word.etymology} ${strings.etymology}`,
					value: trim(etymology, 1024),
				});
			}
		}

		const strings = constants.contexts.language({
			localise: this.#client.localise,
			locale: this.#anchor.displayLocale,
		});

		const languageFlag = constants.emojis.flags[entry.language];
		const languageName = strings.language(entry.language);

		if (!this.#verbose) {
			return [
				{
					title: `${constants.emojis.commands.word.word} ${word}`,
					description: partOfSpeechFormatted,
					fields,
					color: constants.colours.husky,
					footer: { text: `${languageFlag} ${languageName}` },
				},
			];
		}

		const lastEmbed = embeds.at(-1);
		if (lastEmbed !== undefined) {
			lastEmbed.footer = { text: `${languageFlag} ${languageName}` };
		}

		return embeds;
	}

	tagsToString(tags: string[]): string {
		return tags.map((tag) => code(tag)).join(" ");
	}

	isDefinition(_entry: DefinitionField | ExpressionField, entryType: EntryType): _entry is DefinitionField {
		return entryType === "definitions";
	}

	stringifyEntries<
		T extends EntryType,
		E extends DefinitionField[] | ExpressionField[] = T extends "definitions"
			? DefinitionField[]
			: ExpressionField[],
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

			let anchor = entry.labels === undefined ? value : `${this.tagsToString(entry.labels)} ${value}`;
			if (this.isDefinition(entry, entryType)) {
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
					const entriesStringified = this.stringifyEntries(client, interaction, definitions, "definitions", {
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

	fitTextToFieldSize(client: Client, interaction: Logos.Interaction, textParts: string[], verbose: boolean): string {
		const strings = constants.contexts.definitionsOmitted({
			localise: client.localise,
			locale: interaction.displayLocale,
		});
		const characterOverhead =
			strings.definitionsOmitted({
				definitions: client.pluralise(
					"word.strings.definitionsOmitted.definitions",
					interaction.displayLocale,
					{
						quantity: textParts.length,
					},
				),
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
				definitions: client.pluralise(
					"word.strings.definitionsOmitted.definitions",
					interaction.displayLocale,
					{
						quantity: stringsOmitted,
					},
				),
				flag: "verbose",
			})}*`;
		}

		return fittedString;
	}
}

export { WordInformationComponent };
