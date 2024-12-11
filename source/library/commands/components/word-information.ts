import type { DictionarySearchMode } from "logos:constants/dictionaries";
import { code, trim } from "logos:constants/formatting";
import type {
	DictionaryEntry,
	EtymologyField,
	ExampleField,
	ExpressionField,
	LabelledField,
	LemmaField,
	MeaningField,
	NoteField,
	PartOfSpeechField,
	RelationField,
} from "logos/adapters/dictionaries/dictionary-entry";
import type { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { WordSourceNotice } from "logos/commands/components/source-notices/word-source-notice";

type MenuTab = "overview" | "inflection";

type MenuButtonID = [index: string];

class WordInformationComponent {
	readonly #client: Client;
	readonly #entries: DictionaryEntry[];
	readonly #showButton?: Discord.ButtonComponent;
	readonly #verbose: boolean;
	#anchor: Logos.Interaction;
	#tab: MenuTab;
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
			this.#tab = "overview";
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
			case "overview": {
				return this.#formatOverview(entry);
			}
			case "inflection": {
				return this.#formatInflection(entry);
			}
		}
	}

	async #generateButtons(entry: DictionaryEntry): Promise<Discord.MessageComponents> {
		const paginationControls: Discord.ButtonComponent[][] = [];

		switch (this.#tab) {
			case "overview": {
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
				this.#tab = "overview";

				await this.display();
			});

			await this.#client.registerInteractionCollector(definitionsMenuButton);

			const strings = constants.contexts.overviewTab({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			row.push({
				type: Discord.MessageComponentTypes.Button,
				label: strings.definitions,
				disabled: this.#tab === "overview",
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

			const strings = constants.contexts.inflectionTab({
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

	#formatOverview(entry: DictionaryEntry): Discord.Camelize<Discord.DiscordEmbed>[] {
		const partOfSpeechFormatted = this.#formatPartOfSpeech(entry.partOfSpeech);

		const word = entry.lemma.value;

		const embeds: Discord.Camelize<Discord.DiscordEmbed>[] = [];
		const fields: Discord.Camelize<Discord.DiscordEmbedField>[] = [];

		if (entry.definitions !== undefined && entry.definitions.length > 0) {
			const definitionsStringified = this.formatMeaningFields(entry.definitions);
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
			const definitionsStringified = this.formatMeaningFields(entry.translations);
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
			const expressionsStringified = this.formatExpressionFields(entry.expressions);
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
			const etymology = this.formatEtymologyField(entry.etymology);

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

		// TODO(vxern): Display relations.
		// TODO(vxern): Display pronunciation information.
		// TODO(vxern): Display examples.
		// TODO(vxern): Display frequency.
		// TODO(vxern): Display notes.

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
					description: `***${partOfSpeechFormatted}***`,
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

	#formatInflection(entry: DictionaryEntry): Discord.Camelize<Discord.DiscordEmbed>[] {
		const inflectionTable = entry.inflection?.tabs?.at(this.#inflectionTableIndex);
		if (inflectionTable === undefined) {
			return [];
		}

		return [inflectionTable];
	}

	#formatPartOfSpeech(partOfSpeech: PartOfSpeechField | undefined): string {
		if (partOfSpeech === undefined || partOfSpeech.detected === "unknown") {
			const strings = constants.contexts.partOfSpeechUnknown({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			return strings.unknown;
		}

		const strings = constants.contexts.partOfSpeech({
			localise: this.#client.localise,
			locale: this.#anchor.displayLocale,
		});
		return strings.partOfSpeech(partOfSpeech.detected);
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

	isFieldEmpty(field: LabelledField): boolean {
		return (field.labels === undefined || field.labels.length === 0) && field.value.length === 0;
	}

	areFieldsEmpty(fields: LabelledField[]): boolean {
		return fields.length === 0 || fields.some((field) => this.isFieldEmpty(field));
	}

	formatLabelledField(field: LabelledField): string {
		if (field.labels === undefined || field.labels.length === 0) {
			return field.value;
		}

		const labels = field.labels.map((label) => code(label)).join(" ");
		if (field.value.length === 0) {
			return labels;
		}

		return `${labels} ${field.value}`;
	}

	formatLemmaField(field: LemmaField): string {
		if (field.labels === undefined) {
			return field.value;
		}

		const labels = field.labels.join(", ");

		return `${field.value} (${labels})`;
	}

	formatPartOfSpeechField(field: PartOfSpeechField): string {
		if (field.detected !== undefined) {
			return this.formatLabelledField({ value: field.detected, labels: field.labels });
		}

		return this.formatLabelledField(field);
	}

	formatMeaningFields(fields: MeaningField[], { depth = 0 }: { depth?: number } = {}): string[] {
		return fields
			.map((field) => this.formatMeaningField(field, { depth }))
			.map((entry, index) => `${index + 1}. ${entry}`)
			.map((entry) => {
				const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
				return `${whitespace}${entry}`;
			});
	}

	formatMeaningField(field: MeaningField, { depth = 0 }: { depth?: number } = {}): string {
		let root = this.formatLabelledField(field);

		if (depth === 0 && !this.#verbose) {
			return root;
		}

		if (field.relations !== undefined) {
			const relations = this.formatRelationFields(field.relations, { depth: depth + 2 });
			if (relations !== undefined) {
				root = `${root}\n${relations.join("\n")}`;
			}
		}

		if (field.definitions !== undefined && field.definitions.length > 0) {
			const branch = this.formatMeaningFields(field.definitions, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		if (field.expressions !== undefined && field.expressions.length > 0) {
			const branch = this.formatExpressionFields(field.expressions, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		if (field.examples !== undefined && field.examples.length > 0) {
			const branch = this.formatExampleFields(field.examples, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		return root;
	}

	formatExpressionFields(fields: ExpressionField[], { depth = 0 }: { depth?: number } = {}): string[] {
		return fields
			.map((field) => this.formatExpressionField(field, { depth }))
			.map((entry) => {
				const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
				return `${whitespace}${constants.special.bullet} ${entry}`;
			});
	}

	formatExpressionField(field: ExpressionField, { depth = 0 }: { depth?: number } = {}): string {
		let root = this.formatLabelledField({ value: `*${field.value}*`, labels: field.labels });

		if (constants.INCLUDE_EXPRESSION_RELATIONS) {
			if (field.relations !== undefined) {
				const relations = this.formatRelationFields(field.relations, { depth: depth + 1 });
				if (relations !== undefined) {
					root = `${root}\n${relations.join("\n")}`;
				}
			}
		}

		if (field.expressions !== undefined && field.expressions.length > 0) {
			const branch = this.formatExpressionFields(field.expressions, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		return root;
	}

	formatRelationFields(field: RelationField, { depth = 0 }: { depth?: number } = {}): string[] | undefined {
		return this.formatRelationField(field)?.map((entry) => {
			const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
			return `${whitespace}${constants.special.divider} ${entry}`;
		});
	}

	formatRelationField(field: RelationField): string[] | undefined {
		const rows: string[] = [];

		const strings = constants.contexts.wordRelations({
			localise: this.#client.localise,
			locale: this.#anchor.displayLocale,
		});

		const synonyms = field.synonyms ?? [];
		if (synonyms.length > 0) {
			rows.push(`**${strings.synonyms}**: ${synonyms.join(", ")}`);
		}

		const antonyms = field.antonyms ?? [];
		if (antonyms.length > 0) {
			rows.push(`**${strings.antonyms}**: ${antonyms.join(", ")}`);
		}

		const diminutives = field.diminutives ?? [];
		if (diminutives.length > 0) {
			rows.push(`**${strings.diminutives}**: ${diminutives.join(", ")}`);
		}

		const augmentatives = field.augmentatives ?? [];
		if (augmentatives.length > 0) {
			rows.push(`**${strings.augmentatives}**: ${augmentatives.join(", ")}`);
		}

		if (rows.length === 0) {
			return undefined;
		}

		return rows;
	}

	formatPhoneticFields(entry: DictionaryEntry): string {
		const rows: string[] = [];

		const pronunciationRow: string[] = [];
		if (entry.syllables !== undefined) {
			pronunciationRow.push(this.formatLabelledField(entry.syllables));
		}

		if (entry.pronunciation !== undefined) {
			pronunciationRow.push(this.formatLabelledField(entry.pronunciation));
		}

		if (pronunciationRow.length > 0) {
			rows.push(pronunciationRow.join(` ${constants.special.divider} `));
		}

		if (entry.audio !== undefined && entry.audio.length > 0) {
			const strings = {
				audio: this.#client.localise("word.strings.fields.audio", this.#anchor.displayLocale)(),
			};

			const audio = entry.audio
				.map((audioField) =>
					this.formatLabelledField({
						value: `[${strings.audio}](${audioField.value})`,
						labels: audioField.labels,
					}),
				)
				.join(` ${constants.special.dividerShort} `);

			rows.push(audio);
		}

		return rows.map((row) => `${constants.special.bullet} ${row}`).join("\n");
	}

	formatExampleFields(fields: ExampleField[], { depth = 0 }: { depth?: number } = {}): string[] {
		return fields
			.map((field) => `> - ${this.formatLabelledField(field)}`)
			.map((entry) => {
				const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
				return `${whitespace}${entry}`;
			});
	}

	formatEtymologyField(field: EtymologyField): string {
		return this.formatLabelledField(field);
	}

	formatNoteField(field: NoteField): string {
		return this.formatLabelledField(field);
	}
}

export { WordInformationComponent };
