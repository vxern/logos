import type { DictionarySearchMode } from "logos:constants/dictionaries";
import { code, escapeFormatting, trim } from "logos:constants/formatting";
import type {
	DictionaryEntry,
	EtymologyField,
	ExampleField,
	ExpressionField,
	FrequencyField,
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
	readonly #anchor: Logos.Interaction;
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
		if (!interaction.parameters.show) {
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
		const rows: Discord.ButtonComponent[][] = [];

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
				rows.push([
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

				const tabs = entry.inflection.tabs.toChunked(5).reverse();

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

				for (const [row, rowIndex] of tabs.map<[typeof entry.inflection.tabs, number]>((r, i) => [r, i])) {
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
						rows.unshift(buttons);
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

		const firstRow = rows.at(0);
		if (row.length === 1 && firstRow !== undefined && firstRow.length < 5) {
			firstRow.push(row.at(0)!);
		} else {
			rows.push(row);
		}

		return rows.map((row) => ({
			type: Discord.MessageComponentTypes.ActionRow,
			components: row as [Discord.ButtonComponent],
		}));
	}

	#formatOverview(entry: DictionaryEntry): Discord.Camelize<Discord.DiscordEmbed>[] {
		const fields: Discord.Camelize<Discord.DiscordEmbedField>[] = [];

		const lemma = this.#formatLemmaField(entry.lemma);
		const partOfSpeech = this.#formatPartOfSpeechField(entry.partOfSpeech);

		const strings = constants.contexts.language({
			localise: this.#client.localise,
			locale: this.#anchor.displayLocale,
		});
		const languageFlag = constants.emojis.flags[entry.language];
		const languageName = strings.language(entry.language);

		const embed: Discord.DiscordEmbed = {
			description: `__**${lemma}**__${constants.special.sigils.separator}*${partOfSpeech}*`,
			fields,
			color: constants.colours.husky,
			footer: { text: `${languageFlag} ${languageName}` },
		};

		if (entry.definitions !== undefined && !this.#areFieldsEmpty(entry.definitions)) {
			const definitions = this.#limitEntries(
				this.#formatMeaningFields(entry.definitions),
				this.#verbose ? constants.DEFINITIONS_PER_VERBOSE_VIEW : constants.DEFINITIONS_PER_VIEW,
			);

			const strings = constants.contexts.definitions({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.commands.word.definitions} ${strings.definitions}`,
				value: trim(definitions, constants.lengths.embedField),
			});
		}

		if (entry.translations !== undefined && !this.#areFieldsEmpty(entry.translations)) {
			const translations = this.#limitEntries(
				this.#formatMeaningFields(entry.translations),
				this.#verbose ? constants.TRANSLATIONS_PER_VERBOSE_VIEW : constants.TRANSLATIONS_PER_VIEW,
			);

			const strings = constants.contexts.definitions({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.commands.word.definitions} ${strings.definitions}`,
				value: trim(translations, constants.lengths.embedField),
			});
		}

		if (entry.expressions !== undefined && !this.#areFieldsEmpty(entry.expressions)) {
			const expressions = this.#limitEntries(
				this.#formatExpressionFields(entry.expressions),
				this.#verbose ? constants.EXPRESSIONS_PER_VERBOSE_VIEW : constants.EXPRESSIONS_PER_VIEW,
			);

			const strings = constants.contexts.expressions({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.commands.word.expressions} ${strings.expressions}`,
				value: trim(expressions, constants.lengths.embedField),
			});
		}

		if (entry.etymology !== undefined && !this.#isFieldEmpty(entry.etymology)) {
			const etymology = this.#formatEtymologyField(entry.etymology);

			const strings = constants.contexts.etymology({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.commands.word.etymology} ${strings.etymology}`,
				value: trim(etymology, Math.floor(constants.lengths.embedField / 4)),
			});
		}

		if (entry.relations !== undefined) {
			const relations = this.#formatRelationFields(entry.relations);
			if (relations !== undefined) {
				const strings = constants.contexts.relations({
					localise: this.#client.localise,
					locale: this.#anchor.displayLocale,
				});
				fields.push({
					name: `${constants.emojis.commands.word.relations} ${strings.relations}`,
					value: trim(relations.join("\n"), constants.lengths.embedField),
				});
			}
		}

		if (
			entry.syllables !== undefined ||
			entry.pronunciation !== undefined ||
			(entry.audio !== undefined && !this.#areFieldsEmpty(entry.audio))
		) {
			const text = this.#formatPhoneticFields(entry);

			const strings = constants.contexts.pronunciation({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.commands.word.pronunciation} ${strings.pronunciation}`,
				value: trim(text, constants.lengths.embedField),
			});
		}

		if (entry.examples !== undefined && !this.#areFieldsEmpty(entry.examples)) {
			const examples = this.#limitEntries(
				this.#formatExampleFields(entry.examples),
				this.#verbose ? constants.EXAMPLES_PER_VERBOSE_VIEW : constants.EXAMPLES_PER_VIEW,
			);

			const strings = constants.contexts.examples({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.commands.word.examples} ${strings.examples}`,
				value: trim(examples, constants.lengths.embedField),
			});
		}

		if (entry.frequency !== undefined) {
			const frequency = this.#formatFrequencyField(entry.frequency);

			const strings = constants.contexts.frequency({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			const text = trim(`${strings.frequency} ${escapeFormatting(frequency)}`, constants.lengths.embedFooter);
			if (embed.footer !== undefined) {
				embed.footer = { text: `${embed.footer.text} ${constants.special.divider} ${text}` };
			} else {
				embed.footer = { text };
			}
		}

		if (entry.notes !== undefined && !this.#isFieldEmpty(entry.notes)) {
			const notes = this.#formatNoteField(entry.notes);

			const strings = constants.contexts.notes({
				localise: this.#client.localise,
				locale: this.#anchor.displayLocale,
			});
			fields.push({
				name: `${constants.emojis.commands.word.notes} ${strings.notes}`,
				value: trim(notes, constants.lengths.embedField),
			});
		}

		return [embed];
	}

	#formatInflection(entry: DictionaryEntry): Discord.Camelize<Discord.DiscordEmbed>[] {
		const inflectionTable = entry.inflection?.tabs?.at(this.#inflectionTableIndex);
		if (inflectionTable === undefined) {
			return [];
		}

		return [inflectionTable];
	}

	#limitEntries(entries: string[], limit: number): string {
		const fields: string[][] = [];

		let characterCount = 0;
		let field: string[] = [];
		for (const entry of entries) {
			const rows: string[] = [];
			for (const row of entry.split("\n")) {
				if (characterCount + row.length >= constants.lengths.embedField) {
					break;
				}

				rows.push(row);

				characterCount += row.length;
			}

			field.push(rows.join("\n"));

			if (field.length === limit) {
				fields.push(field);

				characterCount = 0;
				field = [];
			}
		}

		if (field.length > 0) {
			fields.push(field);
		}

		return fields.map((field) => field.join("\n")).join("\n");
	}

	#isFieldEmpty(field: LabelledField): boolean {
		return (field.labels === undefined || field.labels.length === 0) && field.value.length === 0;
	}

	#areFieldsEmpty(fields: LabelledField[]): boolean {
		return fields.length === 0 || fields.some((field) => this.#isFieldEmpty(field));
	}

	#formatLabelledField(field: LabelledField): string {
		if (field.labels === undefined || field.labels.length === 0) {
			return field.value;
		}

		const labels = field.labels.map((label) => code(label)).join(" ");
		if (field.value.length === 0) {
			return labels;
		}

		return `${labels} ${field.value}`;
	}

	#formatLemmaField(field: LemmaField): string {
		if (field.labels === undefined) {
			return field.value;
		}

		const labels = field.labels.join(", ");

		return `${field.value} (${labels})`;
	}

	#formatPartOfSpeechField(field: PartOfSpeechField | undefined): string {
		const partOfSpeech = this.#formatPartOfSpeech(field);

		return this.#formatLabelledField({ value: partOfSpeech, labels: field?.labels });
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

	#formatMeaningFields(fields: MeaningField[], { depth = 0 }: { depth?: number } = {}): string[] {
		return fields
			.map((field) => this.#formatMeaningField(field, { depth }))
			.map((entry, index) => `${index + 1}. ${entry}`)
			.map((entry) => {
				const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
				return `${whitespace}${entry}`;
			});
	}

	#formatMeaningField(field: MeaningField, { depth = 0 }: { depth?: number } = {}): string {
		let root = this.#formatLabelledField(field);

		if (depth === 0 && !this.#verbose) {
			return root;
		}

		if (field.relations !== undefined) {
			const relations = this.#formatRelationFields(field.relations, { depth: depth + 1 });
			if (relations !== undefined) {
				root = `${root}\n${relations.join("\n")}`;
			}
		}

		if (field.definitions !== undefined && field.definitions.length > 0) {
			const branch = this.#formatMeaningFields(field.definitions, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		if (field.expressions !== undefined && field.expressions.length > 0) {
			const branch = this.#formatExpressionFields(field.expressions, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		if (field.examples !== undefined && field.examples.length > 0) {
			const branch = this.#formatExampleFields(field.examples, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		return root;
	}

	#formatExpressionFields(fields: ExpressionField[], { depth = 0 }: { depth?: number } = {}): string[] {
		return fields
			.map((field) => this.#formatExpressionField(field, { depth }))
			.map((entry) => {
				const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
				return `${whitespace}${constants.special.bullet} ${entry}`;
			});
	}

	#formatExpressionField(field: ExpressionField, { depth = 0 }: { depth?: number } = {}): string {
		let root = this.#formatLabelledField({ value: `*${field.value}*`, labels: field.labels });

		if (constants.INCLUDE_EXPRESSION_RELATIONS && field.relations !== undefined) {
			const relations = this.#formatRelationFields(field.relations, { depth: depth + 1 });
			if (relations !== undefined) {
				root = `${root}\n${relations.join("\n")}`;
			}
		}

		if (field.expressions !== undefined && field.expressions.length > 0) {
			const branch = this.#formatExpressionFields(field.expressions, { depth: depth + 1 });

			root = `${root}\n${branch.join("\n")}`;
		}

		return root;
	}

	#formatRelationFields(field: RelationField, { depth = 0 }: { depth?: number } = {}): string[] | undefined {
		return this.#formatRelationField(field)?.map((entry) => {
			const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
			return `${whitespace}${constants.special.divider} ${entry}`;
		});
	}

	#formatRelationField(field: RelationField): string[] | undefined {
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

	#formatPhoneticFields(entry: DictionaryEntry): string {
		const rows: string[] = [];

		const pronunciationRow: string[] = [];
		if (entry.syllables !== undefined) {
			pronunciationRow.push(this.#formatLabelledField(entry.syllables));
		}

		if (entry.pronunciation !== undefined) {
			pronunciationRow.push(this.#formatLabelledField(entry.pronunciation));
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
					this.#formatLabelledField({
						value: `[${strings.audio}](${audioField.value})`,
						labels: audioField.labels,
					}),
				)
				.join(` ${constants.special.dividerShort} `);

			rows.push(audio);
		}

		return rows.map((row) => `${constants.special.bullet} ${row}`).join("\n");
	}

	#formatExampleFields(fields: ExampleField[], { depth = 0 }: { depth?: number } = {}): string[] {
		return fields
			.map((field) => `> ${this.#formatLabelledField(field)}`)
			.map((entry) => {
				const whitespace = constants.special.meta.whitespace.repeat(depth * constants.ROW_INDENTATION);
				return `${whitespace}${entry}`;
			});
	}

	#formatFrequencyField(field: FrequencyField): string {
		return `${(field.value * 100).toFixed(1)}%`;
	}

	#formatEtymologyField(field: EtymologyField): string {
		return this.#formatLabelledField(field);
	}

	#formatNoteField(field: NoteField): string {
		return this.#formatLabelledField(field);
	}
}

export { WordInformationComponent };
