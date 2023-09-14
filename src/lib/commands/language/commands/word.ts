import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import languages, {
	Locale,
	getLocalisationLanguageByLocale,
	isLearningLanguage,
} from "../../../../constants/languages";
import localisations from "../../../../constants/localisations";
import defaults from "../../../../defaults";
import { code, trim, withTextStylingDisabled } from "../../../../formatting";
import * as Logos from "../../../../types";
import { Client, localise, pluralise } from "../../../client";
import {
	acknowledge,
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	encodeId,
	getShowButton,
	parseArguments,
	postponeReply,
	reply,
	respond,
} from "../../../interactions";
import { chunk } from "../../../utils";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import { DictionaryAdapter, DictionaryProvision, SearchLanguages } from "../dictionaries/adapter";
import { areAdaptersMissing, isSearchMonolingual, resolveAdapters } from "../dictionaries/adapters";
import {
	AudioField,
	DefinitionField,
	DictionaryEntry,
	EtymologyField,
	ExampleField,
	ExpressionField,
	FrequencyField,
	LabelledField,
	LemmaField,
	NoteField,
	PartOfSpeechField,
	PronunciationField,
	RelationField,
	SyllableField,
	TranslationField,
} from "../dictionaries/dictionary-entry";

const command: CommandTemplate = {
	name: "word",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isRateLimited: true,
	isShowable: true,
	handle: handleFindWord,
	handleAutocomplete: handleFindWordAutocomplete,
	options: [
		{
			name: "word",
			type: Discord.ApplicationCommandOptionTypes.String,
			required: true,
		},
		{
			name: "language",
			type: Discord.ApplicationCommandOptionTypes.String,
			autocomplete: true,
		},
		show,
	],
};

async function handleFindWordAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const [{ language: languageOrUndefined }] = parseArguments(interaction.data?.options, {});
	const languageQuery = languageOrUndefined ?? "";

	const languageQueryLowercase = languageQuery.toLowerCase();
	const choices = languages.languages.localisation
		.map((language) => {
			return {
				name: localise(client, localisations.languages[language], locale)(),
				value: language,
			};
		})
		.filter((choice) => choice.name.toLowerCase().includes(languageQueryLowercase));

	respond([client, bot], interaction, choices);
}

/** Allows the user to look up a word and get information about it. */
async function handleFindWord([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const [{ language: languageOrUndefined, word: lemma, show: showParameter }] = parseArguments(
		interaction.data?.options,
		{
			show: "boolean",
		},
	);
	if (lemma === undefined) {
		return;
	}

	const show = interaction.show ?? showParameter ?? false;
	const language = show ? interaction.guildLanguage : interaction.language;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const isLemmaValid = verifyIsLemmaValid(lemma);
	if (!isLemmaValid) {
		const strings = {
			title: localise(client, "word.strings.invalid.word.title", locale)(),
			description: localise(client, "word.strings.invalid.word.description", locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	if (languageOrUndefined !== undefined && !isLearningLanguage(languageOrUndefined)) {
		const strings = {
			title: localise(client, "word.strings.invalid.language.title", locale)(),
			description: localise(client, "word.strings.invalid.language.description", locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});
		return;
	}

	const learningLanguage = languageOrUndefined !== undefined ? languageOrUndefined : interaction.learningLanguage;

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

	const searchLanguages: SearchLanguages = { source: language, target: learningLanguage };

	const adapters = resolveAdapters(searchLanguages);
	if (adapters === undefined || areAdaptersMissing(adapters)) {
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

	const data: MenuData = {
		entries: {},
		languages: searchLanguages,
		navigation: {
			page: { index: 0 },
			view: {
				definitions: 0,
				translations: 0,
				expressions: 0,
				examples: 0,
			},
			menu: {
				current: "overview",
				tabs: {
					overview: 0,
					usage: 0,
					history: 0,
					inflection: 0,
				},
			},
		},
	};

	const showButton = show ? undefined : getShowButton(client, interaction, { locale });

	const viewData: MenuViewData = {
		display: {
			view: {
				pageCounts: {
					definitions: 0,
					translations: 0,
					expressions: 0,
					examples: 0,
				},
				views: {
					overview: [],
					usage: [],
					history: [],
					inflection: [],
				},
			},
		},
		showButton,
		flags: { expanded: false },
	};

	const expectedProvisions: Record<DictionaryProvision, number> = {
		"part-of-speech": 0,
		definitions: 0,
		translations: 0,
		relations: 0,
		syllables: 0,
		pronunciation: 0,
		rhymes: 0,
		audio: 0,
		expressions: 0,
		examples: 0,
		frequency: 0,
		inflection: 0,
		etymology: 0,
		notes: 0,
	};

	for (const adapter of adapters.primary) {
		for (const provision of adapter.provides) {
			expectedProvisions[provision]++;
		}
	}

	for await (const result of queryAdapters(
		client,
		lemma,
		searchLanguages,
		{ locale },
		{ adapters: adapters.primary },
	)) {
		if (result.entries === undefined) {
			for (const provision of result.adapter.provides) {
				expectedProvisions[provision]--;
			}

			continue;
		}

		for (const entry of result.entries) {
			if (entry.partOfSpeech === undefined) {
				continue;
			}

			const partOfSpeech = entry.partOfSpeech.detected ?? entry.partOfSpeech.value;

			if (!(partOfSpeech in data.entries)) {
				data.entries[partOfSpeech] = [entry];
				continue;
			}

			data.entries[partOfSpeech]?.push(entry);
		}

		displayMenu([client, bot], interaction, data, viewData, { locale });
	}

	/**
   * 
	const unclassifiedEntries: DictionaryEntry[] = [];
	const entriesByPartOfSpeech = new Map<PartOfSpeech, DictionaryEntry[]>();
	let searchesCompleted = 0;
	for (const dictionary of dictionaries) {

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

				existingEntries[index] = { ...existingEntry, ...entry, sources: [...existingEntry.sources, ...entry.sources] };
			}
		}

		searchesCompleted++;
	}

   */

	if (Object.keys(data.entries).length === 0) {
		const strings = {
			title: localise(client, "word.strings.noResults.title", locale)(),
			description: localise(client, "word.strings.noResults.description", locale)({ word: lemma }),
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
				deleteReply([client, bot], interaction).catch(() =>
					client.log.warn(`Failed to delete "no results for word" message.`),
				),
			defaults.WARN_MESSAGE_DELETE_TIMEOUT,
		);

		return;
	}
}

function verifyIsLemmaValid(_: string): boolean {
	return true;
}

type QueryResult = { adapter: DictionaryAdapter; entries?: Partial<DictionaryEntry>[] };
async function* queryAdapters(
	client: Client,
	lemma: string,
	searchLanguages: SearchLanguages,
	{ locale }: { locale: Locale },
	{ adapters }: { adapters: DictionaryAdapter[] },
): AsyncGenerator<QueryResult, void, void> {
	const promises: Promise<QueryResult>[] = [];
	const resolvers: ((_: QueryResult) => void)[] = [];
	const getResolver = () => resolvers.shift() ?? (() => {});

	for (const _ of Array(adapters.length).keys()) {
		promises.push(new Promise((resolve) => resolvers.push(resolve)));
	}

	for (const adapter of adapters) {
		adapter.tryGetInformation(client, lemma, searchLanguages, { locale }).then((entries) => {
			const yieldResult = getResolver();

			if (entries === undefined) {
				yieldResult({ adapter });
			} else {
				yieldResult({
					adapter,
					entries: entries as Partial<DictionaryEntry>[],
				});
			}
		});
	}

	for (const promise of promises) {
		yield promise;
	}
}

type Menu = "overview" | "usage" | "history" | "inflection";
type View = "definitions" | "translations" | "expressions" | "examples";
type MenuFlags = { expanded: boolean };
type MenuData = {
	entries: Record<string, Partial<DictionaryEntry>[]>;
	languages: SearchLanguages;
	navigation: {
		page: { partOfSpeech?: string; index: number };
		view: Record<View, number>;
		menu: { current?: Menu; tabs: Record<Menu, number> };
	};
};
type MenuViewData = {
	display: {
		view: {
			pageCounts: Record<View, number>;
			views: Record<Menu, View[]>;
		};
	};
	showButton: Discord.ButtonComponent | undefined;
	flags: MenuFlags;
};

async function displayMenu(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	data: MenuData,
	viewData: MenuViewData,
	{ locale }: { locale: Locale },
): Promise<void> {
	let partOfSpeech: string;
	if (data.navigation.page.partOfSpeech !== undefined) {
		partOfSpeech = data.navigation.page.partOfSpeech;
	} else {
		const partOfSpeechInitial = Object.keys(data.entries)?.at(0);
		if (partOfSpeechInitial === undefined) {
			return;
		}

		data.navigation.page.partOfSpeech = partOfSpeechInitial;
		partOfSpeech = partOfSpeechInitial;
	}

	const entry = data.entries[partOfSpeech]?.at(data.navigation.page.index);
	if (entry === undefined) {
		return;
	}

	const menus = getMenus(client, data, viewData, entry, { locale });
	if (data.navigation.menu.current === undefined || !(data.navigation.menu.current in menus)) {
		const firstMenu = Object.keys(menus).at(0) as Menu | undefined;
		if (firstMenu === undefined) {
			return;
		}

		data.navigation.menu.current = firstMenu;
	}

	const menu = menus[data.navigation.menu.current];
	if (menu === undefined) {
		return undefined;
	}

	const controls = getControls([client, bot], interaction, data, viewData, { menus, entry }, { locale });

	editReply([client, bot], interaction, { embeds: menu, components: controls });
}

function getMenus(
	client: Client,
	data: MenuData,
	viewData: MenuViewData,
	entry: Partial<DictionaryEntry>,
	{ locale }: { locale: Locale },
): Partial<Record<Menu, Discord.CamelizedDiscordEmbed[]>> {
	const menus: Partial<Record<Menu, Discord.CamelizedDiscordEmbed[]>> = {};

	const overviewViews: View[] = [];
	const usageViews: View[] = [];

	let definitionField: Discord.CamelizedDiscordEmbedField | undefined;
	if (entry.definitions !== undefined && !areFieldsEmpty(entry.definitions)) {
		const definitionsAll = getDefinitionFieldsFormatted(client, entry.definitions, { locale }, viewData.flags);
		const definitionsFitted = distributeEntries(
			definitionsAll,
			viewData.flags.expanded ? defaults.DEFINITIONS_PER_EXPANDED_VIEW : defaults.DEFINITIONS_PER_VIEW,
		);
		viewData.display.view.pageCounts.definitions = definitionsFitted.length;

		const strings = {
			definitions: localise(client, "word.strings.fields.definitions", locale)(),
		};

		const view = definitionsFitted.at(data.navigation.view.definitions);
		if (view !== undefined) {
			definitionField = {
				name: `${constants.symbols.word.definitions} ${strings.definitions}`,
				value: view,
			};
		}
	}

	let translationField: Discord.CamelizedDiscordEmbedField | undefined;
	if (entry.translations !== undefined && !areFieldsEmpty(entry.translations)) {
		const translationsAll = getTranslationFieldsFormatted(entry.translations);
		const translationsFitted = distributeEntries(
			translationsAll,
			viewData.flags.expanded ? defaults.TRANSLATIONS_PER_EXPANDED_VIEW : defaults.TRANSLATIONS_PER_VIEW,
		);
		viewData.display.view.pageCounts.translations = translationsFitted.length;

		const strings = {
			translations: localise(client, "word.strings.fields.translations", locale)(),
		};

		const view = translationsFitted.at(data.navigation.view.translations);
		if (view !== undefined) {
			translationField = {
				name: `${constants.symbols.word.translations} ${strings.translations}`,
				value: withTextStylingDisabled(view),
			};
		}
	}

	let expressionField: Discord.CamelizedDiscordEmbedField | undefined;
	if (entry.expressions !== undefined && !areFieldsEmpty(entry.expressions)) {
		const expressionsAll = getTranslationFieldsFormatted(entry.expressions);
		const expressionsFitted = distributeEntries(
			expressionsAll,
			viewData.flags.expanded ? defaults.EXPRESSIONS_PER_EXPANDED_VIEW : defaults.EXPRESSIONS_PER_VIEW,
		);
		viewData.display.view.pageCounts.expressions = expressionsFitted.length;

		const strings = {
			expressions: localise(client, "word.strings.fields.expressions", locale)(),
		};

		const view = expressionsFitted.at(data.navigation.view.expressions);
		if (view !== undefined) {
			translationField = {
				name: `${constants.symbols.word.expressions} ${strings.expressions}`,
				value: withTextStylingDisabled(view),
			};
		}
	}

	{
		const embed: Discord.CamelizedDiscordEmbed = {
			color: constants.colors.husky,
		};

		if (entry.lemma !== undefined) {
			embed.title = getLemmaFieldFormatted(entry.lemma);
		}

		if (entry.partOfSpeech !== undefined) {
			embed.description = `*${withTextStylingDisabled(getPartOfSpeechFieldFormatted(entry.partOfSpeech))}*`;
		}

		const fields: Discord.CamelizedDiscordEmbedField[] = [];

		if (isSearchMonolingual(data.languages.source, data.languages.target)) {
			if (definitionField !== undefined) {
				fields.push(definitionField);
				overviewViews.push("definitions");
			}
		} else {
			if (translationField !== undefined) {
				fields.push(translationField);
				overviewViews.push("translations");
			}
		}

		if (expressionField !== undefined) {
			fields.push(expressionField);
			overviewViews.push("expressions");
		}

		if (entry.relations !== undefined) {
			const relations = getRelationFieldsFormatted(client, entry.relations, { locale });
			if (relations !== undefined) {
				const strings = {
					relations: localise(client, "word.strings.fields.relations", locale)(),
				};

				fields.push({
					name: `${constants.symbols.word.relations} ${strings.relations}`,
					value: trim(withTextStylingDisabled(relations.join("\n")), constants.lengths.embedField),
				});
			}
		}

		if (
			entry.syllables !== undefined ||
			entry.pronunciation !== undefined ||
			(entry.audio !== undefined && !areFieldsEmpty(entry.audio))
		) {
			const text = getPhoneticFieldsFormatted(
				client,
				{
					syllables: entry.syllables,
					pronunciation: entry.pronunciation,
					audio: entry.audio,
				},
				{ locale },
			);

			const strings = {
				pronunciation: localise(client, "word.strings.fields.pronunciation", locale)(),
			};

			fields.push({
				name: `${constants.symbols.word.pronunciation} ${strings.pronunciation}`,
				value: trim(withTextStylingDisabled(text), constants.lengths.embedField),
			});
		}

		embed.fields = fields;

		if (entry.sources !== undefined && entry.sources.length !== 0) {
			let sourceEmbed: Discord.CamelizedDiscordEmbed;
			{
				const language = getLocalisationLanguageByLocale(locale);
				const strings = {
					sourcedResponsibly: localise(
						client,
						"word.strings.sourcedResponsibly",
						locale,
					)({
						dictionaries: pluralise(
							client,
							"word.strings.sourcedResponsibly.dictionaries",
							language,
							entry.sources.length,
						),
					}),
				};
				const sourcesFormatted = entry.sources.map(({ link, licence }) => `[${licence.name}](${link})`).join(" · ");

				sourceEmbed = {
					description: `${constants.symbols.link} ${sourcesFormatted}`,
					color: constants.colors.peach,
					footer: { text: strings.sourcedResponsibly },
				};
			}

			menus.overview = [sourceEmbed, embed];
		} else {
			menus.overview = [embed];
		}
	}

	{
		const embed: Discord.CamelizedDiscordEmbed = {
			color: constants.colors.orangeRed,
		};

		if (entry.lemma !== undefined) {
			embed.title = getLemmaFieldFormatted(entry.lemma);
		}

		const fields: Discord.CamelizedDiscordEmbedField[] = [];

		if (isSearchMonolingual(data.languages.source, data.languages.target)) {
			if (translationField !== undefined) {
				fields.push(translationField);
				usageViews.push("translations");
			}
		} else {
			if (definitionField !== undefined) {
				fields.push(definitionField);
				usageViews.push("definitions");
			}
		}

		if (entry.examples !== undefined && !areFieldsEmpty(entry.examples)) {
			const examplesAll = getExampleFieldsFormatted(entry.examples);
			const examplesFitted = distributeEntries(
				examplesAll,
				viewData.flags.expanded ? defaults.EXAMPLES_PER_EXPANDED_VIEW : defaults.EXAMPLES_PER_VIEW,
			);
			viewData.display.view.pageCounts.examples = examplesFitted.length;

			const strings = {
				examples: localise(client, "word.strings.fields.examples", locale)(),
			};

			const view = examplesFitted.at(data.navigation.view.examples);
			if (view !== undefined) {
				usageViews.push("examples");

				fields.push({
					name: `${constants.symbols.word.examples} ${strings.examples}`,
					value: withTextStylingDisabled(view),
				});
			}
		}

		if (fields.length !== 0) {
			embed.fields = fields;
			menus.usage = [embed];
		}
	}

	{
		const embed: Discord.CamelizedDiscordEmbed = {
			color: constants.colors.orangeRed,
		};

		if (entry.lemma !== undefined) {
			embed.title = getLemmaFieldFormatted(entry.lemma);
		}

		const fields: Discord.CamelizedDiscordEmbedField[] = [];

		if (entry.frequency !== undefined) {
			const frequency = getFrequencyFieldFormatted(entry.frequency);

			const strings = {
				frequency: localise(client, "word.strings.fields.frequency", locale)(),
			};

			embed.footer = {
				text: trim(
					`${strings.frequency} ${constants.symbols.divider} ${withTextStylingDisabled(frequency)}`,
					constants.lengths.embedFooter,
				),
			};
		}

		if (entry.etymology !== undefined && !isFieldEmpty(entry.etymology)) {
			const etymology = getEtymologyFieldFormatted(entry.etymology);

			const strings = {
				etymology: localise(client, "word.strings.fields.etymology", locale)(),
			};

			fields.push({
				name: `${constants.symbols.word.etymology} ${strings.etymology}`,
				value: trim(withTextStylingDisabled(etymology), constants.lengths.embedField),
			});
		}

		if (entry.notes !== undefined && !isFieldEmpty(entry.notes)) {
			const notes = getNoteFieldFormatted(entry.notes);

			const strings = {
				notes: localise(client, "word.strings.fields.notes", locale)(),
			};

			fields.push({
				name: `${constants.symbols.word.notes} ${strings.notes}`,
				value: trim(withTextStylingDisabled(notes), constants.lengths.embedField),
			});
		}

		if (fields.length !== 0) {
			embed.fields = fields;
			menus.history = [embed];
		}
	}

	if (entry.inflection !== undefined && entry.inflection.tabs.length !== 0) {
		const embed = entry.inflection.tabs.at(data.navigation.menu.tabs.inflection);
		if (embed !== undefined) {
			menus.inflection = [embed];
		}
	}

	viewData.display.view.views.overview = overviewViews;
	viewData.display.view.views.usage = usageViews;

	return menus;
}

function isFieldEmpty(field: LabelledField): boolean {
	return (field.labels === undefined || field.labels.length === 0) && field.value.length === 0;
}

function areFieldsEmpty(fields: LabelledField[]): boolean {
	return fields.length === 0 || fields.some((field) => isFieldEmpty(field));
}

function getLabelledFieldFormatted(value: string, labels?: string[]): string {
	if (labels !== undefined && labels.length !== 0) {
		const labelsFormatted = labels.map((tag) => code(tag)).join(" ");
		if (value.length === 0) {
			return labelsFormatted;
		}

		return `${labelsFormatted} ${value}`;
	}

	return value;
}

function getLemmaFieldFormatted(field: LemmaField): string {
	if (field.labels === undefined) {
		return field.value;
	}

	const labels = field.labels.join(", ");

	return `${field.value} (${labels})`;
}

function getPartOfSpeechFieldFormatted(field: PartOfSpeechField): string {
	if (field.detected !== undefined) {
		return getLabelledFieldFormatted(field.detected, field.labels);
	}

	return getLabelledFieldFormatted(field.value, field.labels);
}

function getDefinitionFieldsFormatted(
	client: Client,
	fields: DefinitionField[],
	{ locale }: { locale: Locale },
	flags: MenuFlags,
	stack?: { depth: number },
): string[] {
	return fields
		.map((field) => getDefinitionFieldFormatted(client, field, { locale }, flags, stack))
		.map((entry, index) => `${index + 1}. ${entry}`)
		.map((entry) => {
			const depth = stack?.depth ?? 0;
			const whitespace = constants.symbols.meta.whitespace.repeat(depth * defaults.DEFINITION_ROW_INDENTATION);
			return `${whitespace}${entry}`;
		});
}

function getDefinitionFieldFormatted(
	client: Client,
	field: DefinitionField,
	{ locale }: { locale: Locale },
	flags: MenuFlags,
	stack?: { depth: number },
): string {
	let root = flags.expanded ? getLabelledFieldFormatted(field.value, field.labels) : field.value;

	if ((stack === undefined || stack.depth === 0) && !flags.expanded) {
		return root;
	}

	if (field.relations !== undefined) {
		const relations = getRelationFieldsFormatted(
			client,
			field.relations,
			{ locale },
			stack !== undefined ? { depth: stack.depth + 2 } : { depth: 2 },
		);
		if (relations !== undefined) {
			root = `${root}\n${relations.join("\n")}`;
		}
	}

	if (field.definitions !== undefined && field.definitions.length !== 0) {
		const branch = getDefinitionFieldsFormatted(
			client,
			field.definitions,
			{ locale },
			flags,
			stack !== undefined ? { depth: stack.depth + 1 } : { depth: 1 },
		);

		root = `${root}\n${branch.join("\n")}`;
	}

	if (field.expressions !== undefined && field.expressions.length !== 0) {
		const branch = getExpressionFieldsFormatted(
			client,
			field.expressions,
			{ locale },
			stack !== undefined ? { depth: stack.depth + 1 } : { depth: 1 },
		);

		root = `${root}\n${branch.join("\n")}`;
	}

	return root;
}

function getTranslationFieldsFormatted(fields: TranslationField[]): string[] {
	return fields
		.map((field) => getLabelledFieldFormatted(field.value, field.labels))
		.map((entry, index) => `${index + 1}. ${entry}`);
}

function getExpressionFieldsFormatted(
	client: Client,
	fields: ExpressionField[],
	{ locale }: { locale: Locale },
	stack?: { depth: number },
): string[] {
	return fields
		.map((field) => getExpressionFieldFormatted(client, field, { locale }, stack))
		.map((entry) => {
			const depth = stack?.depth ?? 0;
			const whitespace = constants.symbols.meta.whitespace.repeat(depth * defaults.DEFINITION_ROW_INDENTATION);
			return `${whitespace}${constants.symbols.bullet} ${entry}`;
		});
}

function getExpressionFieldFormatted(
	client: Client,
	field: ExpressionField,
	{ locale }: { locale: Locale },
	stack?: { depth: number },
): string {
	let root = getLabelledFieldFormatted(`*${field.value}*`, field.labels);

	if (defaults.INCLUDE_EXPRESSION_RELATIONS) {
		if (field.relations !== undefined) {
			const relations = getRelationFieldsFormatted(
				client,
				field.relations,
				{ locale },
				stack !== undefined ? { depth: stack.depth + 1 } : { depth: 1 },
			);
			if (relations !== undefined) {
				root = `${root}\n${relations.join("\n")}`;
			}
		}
	}

	if (field.expressions !== undefined && field.expressions.length !== 0) {
		const branch = getExpressionFieldsFormatted(
			client,
			field.expressions,
			{ locale },
			stack !== undefined ? { depth: stack.depth + 1 } : { depth: 1 },
		);

		root = `${root}\n${branch.join("\n")}`;
	}

	return root;
}

function getRelationFieldsFormatted(
	client: Client,
	field: RelationField,
	{ locale }: { locale: Locale },
	stack?: { depth: number },
): string[] | undefined {
	return getRelationFieldFormatted(client, field, { locale })?.map((entry) => {
		const depth = stack?.depth ?? 0;
		const whitespace = constants.symbols.meta.whitespace.repeat(depth * defaults.DEFINITION_ROW_INDENTATION);
		return `${whitespace}${constants.symbols.divider} ${entry}`;
	});
}

function getRelationFieldFormatted(
	client: Client,
	field: RelationField,
	{ locale }: { locale: Locale },
): string[] | undefined {
	const rows: string[] = [];

	const strings = {
		synonyms: localise(client, "word.strings.relations.synonyms", locale)(),
		antonyms: localise(client, "word.strings.relations.antonyms", locale)(),
		diminutives: localise(client, "word.strings.relations.diminutives", locale)(),
		augmentatives: localise(client, "word.strings.relations.augmentatives", locale)(),
	};

	const synonyms = field.synonyms ?? [];
	const antonyms = field.antonyms ?? [];
	const diminutives = field.diminutives ?? [];
	const augmentatives = field.augmentatives ?? [];

	if (synonyms.length !== 0 || antonyms.length !== 0) {
		const columns: string[] = [];

		if (synonyms.length !== 0) {
			columns.push(`**${strings.synonyms}**: ${synonyms.join(", ")}`);
		}

		if (antonyms.length !== 0) {
			columns.push(`**${strings.antonyms}**: ${antonyms.join(", ")}`);
		}

		const row = columns.join(` ${constants.symbols.divider} `);

		rows.push(row);
	}

	if (diminutives.length !== 0 || augmentatives.length !== 0) {
		const columns: string[] = [];

		if (diminutives.length !== 0) {
			columns.push(`**${strings.diminutives}**: ${diminutives.join(", ")}`);
		}

		if (augmentatives.length !== 0) {
			columns.push(`**${strings.augmentatives}**: ${augmentatives.join(", ")}`);
		}

		const row = columns.join(` ${constants.symbols.divider} `);

		rows.push(row);
	}

	if (rows.length === 0) {
		return undefined;
	}

	return rows;
}

function getPhoneticFieldsFormatted(
	client: Client,
	entry: {
		syllables?: SyllableField;
		pronunciation?: PronunciationField;
		audio?: AudioField[];
	},
	{ locale }: { locale: Locale },
): string {
	const rows = [];

	const pronunciationRow = [];
	if (entry.syllables !== undefined) {
		const syllables = getLabelledFieldFormatted(entry.syllables.value, entry.syllables.labels);
		pronunciationRow.push(syllables);
	}

	if (entry.pronunciation !== undefined) {
		const pronunciation = getLabelledFieldFormatted(entry.pronunciation.value, entry.pronunciation.labels);
		pronunciationRow.push(pronunciation);
	}

	if (pronunciationRow.length !== 0) {
		rows.push(pronunciationRow.join(` ${constants.symbols.divider} `));
	}

	if (entry.audio !== undefined && entry.audio.length !== 0) {
		const strings = {
			audio: localise(client, "word.strings.fields.audio", locale)(),
		};

		const audio = entry.audio
			.map((audioField) => getLabelledFieldFormatted(`[${strings.audio}](${audioField.value})`, audioField.labels))
			.join(` ${constants.symbols.dividerShort} `);

		rows.push(audio);
	}

	return rows.map((row) => `${constants.symbols.bullet} ${row}`).join("\n");
}

function getExampleFieldsFormatted(fields: ExampleField[]): string[] {
	return fields.map((field) => getLabelledFieldFormatted(field.value, field.labels));
}

function getFrequencyFieldFormatted(field: FrequencyField): string {
	return (field.value * 100).toPrecision();
}

function getEtymologyFieldFormatted(field: EtymologyField): string {
	return getLabelledFieldFormatted(field.value, field.labels);
}

function getNoteFieldFormatted(field: NoteField): string {
	return getLabelledFieldFormatted(field.value, field.labels);
}

function distributeEntries(entries: string[], perView: number): string[] {
	const pageUpIndicator = constants.symbols.interactions.menu.controls.up;
	const pageDownIndicator = constants.symbols.interactions.menu.controls.down;

	const fieldsRaw: string[][] = [];

	let characterCount = 0;
	let field: string[] = [];
	for (const entry of entries) {
		const rows: string[] = [];
		for (const row of entry.split("\n")) {
			if (characterCount + row.length >= constants.lengths.embedFieldWithOverhead) {
				break;
			}

			rows.push(row);

			characterCount += row.length;
		}

		field.push(rows.join("\n"));

		if (field.length === perView) {
			fieldsRaw.push(field);

			characterCount = 0;
			field = [];
		}
	}

	if (field.length !== 0) {
		fieldsRaw.push(field);
	}

	const fieldCount = fieldsRaw.length;
	const fields: string[] = [];

	for (const [field, index] of fieldsRaw.map<[string[], number]>((field, index) => [field, index])) {
		if (fieldCount !== 1) {
			if (index !== 0) {
				field.unshift(pageUpIndicator);
			}

			if (index !== fieldCount - 1) {
				field.push(pageDownIndicator);
			}
		}

		fields.push(field.join("\n"));
	}

	return fields;
}

function getControls(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	data: MenuData,
	viewData: MenuViewData,
	{
		menus,
		entry,
	}: {
		menus: Partial<Record<Menu, Discord.CamelizedDiscordEmbed[]>>;
		entry: Partial<DictionaryEntry>;
	},
	{ locale }: { locale: Locale },
): Discord.MessageComponents {
	const controls: Discord.ActionRow[] = [];

	switch (data.navigation.menu.current) {
		case "overview": {
			controls.push(...getOverviewControls([client, bot], interaction, data, viewData, entry, { locale }));
			break;
		}
		case "inflection": {
			controls.push(...getInflectionControls([client, bot], interaction, data, viewData, entry, { locale }));
			break;
		}
	}

	const strings = {
		overview: localise(client, "word.strings.menus.overview", locale)(),
		usage: localise(client, "word.strings.menus.usage", locale)(),
		history: localise(client, "word.strings.menus.history", locale)(),
		inflection: localise(client, "word.strings.menus.inflection", locale)(),
	};

	const menuButtons: Discord.ButtonComponent[] = [];
	for (const menu of Object.keys(menus) as Menu[]) {
		const buttonId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			onCollect: async (selection) => {
				acknowledge([client, bot], selection);

				data.navigation.menu.current = menu;

				displayMenu([client, bot], interaction, data, viewData, { locale });
			},
		});

		menuButtons.push({
			type: Discord.MessageComponentTypes.Button,
			label: strings[menu],
			disabled: data.navigation.menu.current === menu,
			customId: buttonId,
			style: Discord.ButtonStyles.Primary,
		});
	}

	if (viewData.showButton !== undefined) {
		menuButtons.push(viewData.showButton);
	}

	if (menuButtons.length > 1) {
		controls.push({
			type: Discord.MessageComponentTypes.ActionRow,
			components: menuButtons as unknown as [Discord.ButtonComponent],
		});
	}

	controls.push(...getPaginationControls([client, bot], interaction, data, viewData, { locale }));

	return controls;
}

type DictionaryEntryGroup = [string, DictionaryEntry[]];
type DictionaryEntriesAssorted = {
	previous: DictionaryEntryGroup[];
	current: DictionaryEntryGroup;
	next: DictionaryEntryGroup[];
};
function getPaginationControls(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	data: MenuData,
	viewData: MenuViewData,
	{ locale }: { locale: Locale },
): Discord.ActionRow[] {
	const getGroups = (): DictionaryEntriesAssorted => {
		const groups = Object.entries(data.entries) as [string, DictionaryEntry[]][];
		const currentGroupIndex = groups.findIndex(
			([partOfSpeech, _]) => partOfSpeech === data.navigation.page.partOfSpeech,
		);
		const group = groups[currentGroupIndex];
		if (group === undefined) {
			throw "StateError: Group unexpectedly undefined.";
		}

		return {
			previous: groups.slice(0, currentGroupIndex),
			current: group,
			next: groups.slice(currentGroupIndex + 1),
		};
	};
	const getPageNumber = () => {
		const precedentPageCount = getGroups().previous.flatMap(([_, entries]) => entries).length;
		return precedentPageCount + 1;
	};
	const getPageCount = () => Object.values(data.entries).flat().length;
	const isFirstPage = () =>
		data.navigation.page.partOfSpeech === Object.keys(data.entries).at(0) && data.navigation.page.index === 0;
	const isLastPage = () =>
		data.navigation.page.partOfSpeech === Object.keys(data.entries).at(-1) && getPageNumber() === getPageCount();
	const isFirstInGroup = () => data.navigation.page.index === 0;
	const isLastInGroup = () =>
		data.navigation.page.partOfSpeech !== undefined &&
		data.navigation.page.index === (data.entries[data.navigation.page.partOfSpeech]?.length ?? 0) - 1;

	if (isFirstPage() && isLastPage()) {
		return [];
	}

	const previousPageButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			if (!isFirstPage()) {
				if (isFirstInGroup()) {
					const previousGroup = getGroups().previous.at(-1);
					if (previousGroup === undefined) {
						return;
					}
					const [partOfSpeech, entries] = previousGroup;

					data.navigation.page.partOfSpeech = partOfSpeech;
					data.navigation.page.index = entries.length - 1;
				} else {
					data.navigation.page.index--;
				}

				data.navigation.view = {
					definitions: 0,
					translations: 0,
					expressions: 0,
					examples: 0,
				};
				data.navigation.menu.tabs = {
					overview: 0,
					usage: 0,
					history: 0,
					inflection: 0,
				};
			}

			displayMenu([client, bot], interaction, data, viewData, { locale });
		},
	});

	const nextPageButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			if (!isLastPage()) {
				if (isLastInGroup()) {
					const nextGroup = getGroups().next.at(0);
					if (nextGroup === undefined) {
						return;
					}
					const [partOfSpeech, _] = nextGroup;

					data.navigation.page.partOfSpeech = partOfSpeech;
					data.navigation.page.index = 0;
				} else {
					data.navigation.page.index++;
				}

				data.navigation.view = {
					definitions: 0,
					translations: 0,
					expressions: 0,
					examples: 0,
				};
				data.navigation.menu.tabs = {
					overview: 0,
					usage: 0,
					history: 0,
					inflection: 0,
				};
			}

			displayMenu([client, bot], interaction, data, viewData, { locale });
		},
	});

	const groups = getGroups();
	const [_, entries] = groups.current;
	const entry = entries[data.navigation.page.index];
	if (entry === undefined) {
		throw "StateError: Entry unexpectedly undefined.";
	}

	const strings = {
		page: localise(
			client,
			"word.strings.page",
			locale,
		)({
			page_number: getPageNumber(),
			page_count: getPageCount(),
		}),
	};

	return [
		{
			type: Discord.MessageComponentTypes.ActionRow,
			components: [
				{
					type: Discord.MessageComponentTypes.Button,
					label: constants.symbols.interactions.menu.controls.back,
					disabled: isFirstPage(),
					customId: previousPageButtonId,
					style: Discord.ButtonStyles.Secondary,
				},
				{
					type: Discord.MessageComponentTypes.Button,
					label: strings.page,
					style: Discord.ButtonStyles.Secondary,
					customId: constants.components.none,
				},
				{
					type: Discord.MessageComponentTypes.Button,
					label: constants.symbols.interactions.menu.controls.forward,
					disabled: isLastPage(),
					customId: nextPageButtonId,
					style: Discord.ButtonStyles.Secondary,
				},
			],
		},
	];
}

type ExpandedMode = `${boolean}`;
type OverviewModeButtonID<State extends string> = [state: State];

function getOverviewControls(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	data: MenuData,
	viewData: MenuViewData,
	entry: Partial<DictionaryEntry>,
	{ locale }: { locale: Locale },
): Discord.ActionRow[] {
	const isFirstPage = (view?: View) =>
		view !== undefined
			? data.navigation.view[view] === 0
			: Object.values(data.navigation.view).every((index) => index === 0);
	const isLastPage = (view?: View): boolean => {
		if (data.navigation.menu.current === undefined) {
			return false;
		}

		if (view !== undefined) {
			return data.navigation.view[view] === viewData.display.view.pageCounts[view] - 1;
		}

		return viewData.display.view.views[data.navigation.menu.current].every(
			(view) => data.navigation.view[view] === viewData.display.view.pageCounts[view] - 1,
		);
	};

	if (entry.definitions === undefined) {
		return [];
	}

	const scrollDownButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		limit: 1,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			if (data.navigation.menu.current === undefined) {
				return;
			}

			if (isLastPage()) {
				return;
			}

			for (const view of viewData.display.view.views[data.navigation.menu.current]) {
				if (isLastPage(view)) {
					continue;
				}

				data.navigation.view[view]++;
			}

			displayMenu([client, bot], interaction, data, viewData, { locale });
		},
	});

	const scrollUpButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		limit: 1,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			if (data.navigation.menu.current === undefined) {
				return;
			}

			if (isFirstPage()) {
				return;
			}

			for (const view of viewData.display.view.views[data.navigation.menu.current]) {
				if (isFirstPage(view)) {
					continue;
				}

				data.navigation.view[view]--;
			}

			displayMenu([client, bot], interaction, data, viewData, { locale });
		},
	});

	const toggleExpandedModeButtonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		limit: 1,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			if (entry.definitions === undefined || selection.data === undefined) {
				displayMenu([client, bot], interaction, data, viewData, { locale });
				return;
			}

			const customId = selection.data.customId;
			if (customId === undefined) {
				return;
			}

			const [_, expandedString] = decodeId<OverviewModeButtonID<ExpandedMode>>(customId);
			const expanded = expandedString === "true" ? true : false;

			viewData.flags.expanded = expanded;

			displayMenu([client, bot], interaction, data, viewData, { locale });
		},
	});

	const strings = {
		expand: localise(client, "word.strings.modes.expanded.expand", locale)(),
		contract: localise(client, "word.strings.modes.expanded.contract", locale)(),
	};

	return [
		{
			type: Discord.MessageComponentTypes.ActionRow,
			components: [
				{
					type: Discord.MessageComponentTypes.Button,
					label: constants.symbols.interactions.menu.controls.down,
					disabled: isLastPage(),
					customId: scrollDownButtonId,
					style: Discord.ButtonStyles.Danger,
				},
				{
					type: Discord.MessageComponentTypes.Button,
					label: constants.symbols.interactions.menu.controls.up,
					disabled: isFirstPage(),
					customId: scrollUpButtonId,
					style: Discord.ButtonStyles.Danger,
				},
				{
					type: Discord.MessageComponentTypes.Button,
					label: viewData.flags.expanded ? strings.contract : strings.expand,
					customId: encodeId<OverviewModeButtonID<ExpandedMode>>(toggleExpandedModeButtonId, [
						`${!viewData.flags.expanded}`,
					]),
					style: Discord.ButtonStyles.Danger,
				},
			],
		},
	];
}

type InflectionTabButtonID = [index: string];

function getInflectionControls(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	data: MenuData,
	viewData: MenuViewData,
	entry: Partial<DictionaryEntry>,
	{ locale }: { locale: Locale },
): Discord.ActionRow[] {
	if (entry.inflection === undefined) {
		return [];
	}

	const buttonId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		limit: 1,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			if (entry.inflection === undefined || selection.data === undefined) {
				displayMenu([client, bot], interaction, data, viewData, { locale });
				return;
			}

			const customId = selection.data?.customId;
			if (customId === undefined) {
				return;
			}

			const [_, indexString] = decodeId<InflectionTabButtonID>(customId);
			const index = Number(indexString);

			if (index >= 0 && index <= entry.inflection.tabs.length) {
				data.navigation.menu.tabs.inflection = index;
			}

			displayMenu([client, bot], interaction, data, viewData, { locale });
		},
	});

	const tabsChunked = chunk(entry.inflection.tabs, 5).reverse();
	const rows: Discord.ActionRow[] = [];
	for (const [row, rowIndex] of tabsChunked.map<[typeof entry.inflection["tabs"], number]>((r, i) => [r, i])) {
		const buttons = row.map<Discord.ButtonComponent>((table, index) => {
			const index_ = rowIndex * 5 + index;

			return {
				type: Discord.MessageComponentTypes.Button,
				label: table.title,
				disabled: data.navigation.menu.tabs.inflection === index_,
				customId: encodeId<InflectionTabButtonID>(buttonId, [index_.toString()]),
				style: Discord.ButtonStyles.Danger,
			};
		});

		if (buttons.length === 1) {
			continue;
		}

		rows.push({
			type: Discord.MessageComponentTypes.ActionRow,
			components: buttons as [Discord.ButtonComponent],
		});
	}

	return rows;
}

export default command;
