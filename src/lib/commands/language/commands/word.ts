import * as Discord from "@discordeno/bot";
import constants from "../../../../constants/constants";
import languages, {
	Languages,
	LearningLanguage,
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
import { language, show, word } from "../../parameters";
import { DictionaryAdapter, DictionaryProvision } from "../dictionaries/adapter";
import {
	AdaptersResolved,
	areAdaptersMissing,
	getAdapterSelection,
	isSearchMonolingual,
	resolveAdapters,
} from "../dictionaries/adapters";
import {
	AudioField,
	DictionaryEntry,
	DictionaryEntryField,
	EtymologyField,
	ExampleField,
	ExpressionField,
	FrequencyField,
	LabelledField,
	LemmaField,
	MeaningField,
	NoteField,
	PartOfSpeechField,
	PronunciationField,
	RelationField,
	SyllableField,
	provisionToField,
	requiredDictionaryEntryFields,
} from "../dictionaries/dictionary-entry";
import { createProvisionSupply, getProvisionsWithoutSupply } from "../dictionaries/dictionary-provision";

const sections = [
	"definitions",
	"etymology",
	"examples",
	"expressions",
	"inflection",
	"metadata",
	"pronunciation",
	"relations",
] as const;
type SectionType = typeof sections[number];

const provisionsBySection: Record<SectionType, DictionaryProvision[]> = {
	definitions: ["definitions", "translations"],
	etymology: ["etymology"],
	examples: ["examples"],
	expressions: ["expressions"],
	inflection: ["inflection"],
	metadata: ["frequency", "notes"],
	pronunciation: ["pronunciation", "rhymes", "audio"],
	relations: ["relations"],
};

const commands = {
	word: {
		name: "word",
		type: Discord.ApplicationCommandTypes.ChatInput,
		defaultMemberPermissions: ["VIEW_CHANNEL"],
		isRateLimited: true,
		isShowable: true,
		handle: handleGetAllSections,
		handleAutocomplete: handleGetInformationAutocomplete,
		options: [word, language, show],
	},
	...(Object.fromEntries(
		sections.map((type) => [
			type,
			{
				name: `word.options.${type}`,
				type: Discord.ApplicationCommandTypes.ChatInput,
				defaultMemberPermissions: ["VIEW_CHANNEL"],
				isRateLimited: true,
				isShowable: true,
				handle: ([client, bot], interaction) => handleGetSingleSection([client, bot], interaction, type),
				handleAutocomplete: handleGetInformationAutocomplete,
				options: [word, language, show],
			},
		]),
	) as Record<SectionType, CommandTemplate>),
} satisfies Record<string, CommandTemplate>;

async function handleGetInformationAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const [{ language: languageOrUndefined }] = parseArguments(interaction.data?.options, {});
	const languageQueryRaw = languageOrUndefined ?? "";

	const languageQueryTrimmed = languageQueryRaw.trim();
	if (languageQueryTrimmed.length === 0) {
		const strings = {
			autocomplete: localise(client, "autocomplete.language", locale)(),
		};

		respond([client, bot], interaction, [{ name: trim(strings.autocomplete, 100), value: "" }]);
		return;
	}

	const languageQueryLowercase = languageQueryTrimmed.toLowerCase();
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
async function handleGetAllSections(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const lookupData = await resolveData([client, bot], interaction);
	if (lookupData === undefined) {
		return undefined;
	}

	const { lemma, show, locale, searchLanguages, adapters } = lookupData;

	await postponeReply([client, bot], interaction, { visible: show });

	const showButton = show ? undefined : getShowButton(client, interaction, { locale });

	const provisionSupply = createProvisionSupply();

	const menu = new WordMenu({ searchLanguages, showButton });

	for await (const result of queryAdaptersOrdered(
		client,
		lemma,
		searchLanguages,
		{ adapters: [...adapters.primary], provisionSupply },
		defaults.PRIMARY_ADAPTER_QUERY_COUNT,
		{ locale },
	)) {
		await menu.receiveResult(result);
		menu.sortEntries();
		await menu.updateView([client, bot], interaction, { locale });
	}

	const secondaryAdapters = getAdapterSelection(
		getProvisionsWithoutSupply(provisionSupply),
		adapters.secondary,
		defaults.SECONDARY_ADAPTER_QUERY_COUNT,
	);
	for (const adapter of secondaryAdapters) {
		for (const provision of adapter.provides) {
			provisionSupply[provision]++;
		}
	}

	for await (const result of queryAdapters(
		client,
		lemma,
		searchLanguages,
		{ locale },
		{ adapters: secondaryAdapters },
	)) {
		if (result.entries === undefined) {
			for (const provision of result.adapter.provides) {
				provisionSupply[provision]--;
			}

			continue;
		}

		await menu.receiveResult(result);
		await menu.updateView([client, bot], interaction, { locale });
	}

	const tertiaryAdapters = getAdapterSelection(
		getProvisionsWithoutSupply(provisionSupply),
		adapters.tertiary,
		defaults.TERTIARY_ADAPTER_QUERY_COUNT,
	);
	for (const adapter of tertiaryAdapters) {
		for (const provision of adapter.provides) {
			provisionSupply[provision]++;
		}
	}

	for await (const result of queryAdapters(
		client,
		lemma,
		searchLanguages,
		{ locale },
		{ adapters: tertiaryAdapters },
	)) {
		if (result.entries === undefined) {
			for (const provision of result.adapter.provides) {
				provisionSupply[provision]--;
			}

			continue;
		}

		await menu.receiveResult(result);
		await menu.updateView([client, bot], interaction, { locale });
	}

	if (!menu.displayed) {
		const strings = {
			title: localise(client, "word.strings.noResults.title", locale)(),
			description: {
				word: localise(client, "word.strings.noResults.description.word", locale)({ word: lemma }),
			},
		};

		await editReply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.word,
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

async function handleGetSingleSection(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	sectionType: SectionType,
): Promise<void> {
	const lookupData = await resolveData([client, bot], interaction);
	if (lookupData === undefined) {
		return undefined;
	}

	const { lemma, show, locale, searchLanguages, adapters } = lookupData;

	await postponeReply([client, bot], interaction, { visible: show });

	const provisions = provisionsBySection[sectionType];

	const showButton = show ? undefined : getShowButton(client, interaction, { locale });

	const provisionSupply = createProvisionSupply();

	const menu = new WordMenu({ searchLanguages, showButton, sectionType });

	const adaptersSelected = getAdapterSelection(
		provisions,
		[...adapters.primary, ...adapters.secondary, ...adapters.tertiary],
		-1,
	);

	for await (const result of queryAdaptersOrdered(
		client,
		lemma,
		searchLanguages,
		{ adapters: adaptersSelected, provisionSupply },
		defaults.PRIMARY_ADAPTER_QUERY_COUNT,
		{ locale },
	)) {
		await menu.receiveResult(result);
		menu.sortEntries();
		await menu.updateView([client, bot], interaction, { locale });
	}

	if (!menu.displayed) {
		const strings = {
			title: localise(client, "word.strings.noResults.title", locale)(),
			description: {
				section: localise(client, "word.strings.noResults.description.section", locale)({ word: lemma }),
			},
		};

		await editReply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description.section,
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

type LookupData = {
	lemma: string;
	show: boolean;
	locale: Locale;
	searchLanguages: Languages<LearningLanguage>;
	adapters: AdaptersResolved;
};
async function resolveData(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<LookupData | undefined> {
	const [{ language: languageOrUndefined, word: lemma, show: showParameter }] = parseArguments(
		interaction.data?.options,
		{
			show: "boolean",
		},
	);
	if (lemma === undefined) {
		return undefined;
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
		return undefined;
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
		return undefined;
	}

	const learningLanguage = languageOrUndefined !== undefined ? languageOrUndefined : interaction.learningLanguage;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return undefined;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return undefined;
	}

	const searchLanguages: Languages<LearningLanguage> = { source: language, target: learningLanguage };

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
		return undefined;
	}

	return { lemma, show, locale, searchLanguages, adapters };
}

function verifyIsLemmaValid(_: string): boolean {
	return true;
}

type QueryResult = { adapter: DictionaryAdapter; entries?: Partial<DictionaryEntry>[] };
async function* queryAdapters(
	client: Client,
	lemma: string,
	languages: Languages<LearningLanguage>,
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
		adapter.tryGetInformation(client, lemma, languages, { locale }).then((entries) => {
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

async function* queryAdaptersOrdered(
	client: Client,
	lemma: string,
	searchLanguages: Languages<LearningLanguage>,
	data: { adapters: DictionaryAdapter[]; provisionSupply: Record<DictionaryProvision, number> },
	count: number,
	{ locale }: { locale: Locale },
): AsyncGenerator<QueryResult, void, void> {
	let primaryAdaptersToQuery = count;
	while (data.adapters.length !== 0) {
		const adapters = [];
		for (const _ of Array(primaryAdaptersToQuery).keys()) {
			const adapter = data.adapters.shift();
			if (adapter === undefined) {
				break;
			}

			adapters.push(adapter);
		}

		primaryAdaptersToQuery = 0;

		for (const adapter of adapters) {
			for (const provision of adapter.provides) {
				data.provisionSupply[provision]++;
			}
		}

		const fallbacks: QueryResult[] = [];
		for await (const result of queryAdapters(client, lemma, searchLanguages, { locale }, { adapters })) {
			if (result.entries === undefined) {
				primaryAdaptersToQuery++;
				for (const provision of result.adapter.provides) {
					data.provisionSupply[provision]--;
				}

				continue;
			}

			if (adapters.indexOf(result.adapter) !== 0) {
				fallbacks.push(result);

				continue;
			}

			yield result;
		}

		for (const result of fallbacks) {
			yield result;
		}

		if (primaryAdaptersToQuery === 0) {
			break;
		}
	}
}

type MenuTab = "overview" | "usage" | "history" | "inflection";
type ViewTab = "definitions" | "translations" | "expressions" | "examples";

interface MenuNavigationData {
	page: { partOfSpeech?: string; index: number };
	view: Record<ViewTab, number>;
	menu: { current?: MenuTab; tabs: Record<MenuTab, number> };
}

interface MenuDisplayData {
	view: {
		pageCounts: Record<ViewTab, number>;
		views: Record<MenuTab, ViewTab[]>;
	};
	expanded: boolean;
	simplified: boolean;
	sectionType?: SectionType;
}

type DictionaryEntryGroup = [string, Partial<DictionaryEntry>[]];
type DictionaryEntriesAssorted = {
	previous: DictionaryEntryGroup[];
	current: DictionaryEntryGroup;
	next: DictionaryEntryGroup[];
};

type ExpandedMode = `${boolean}`;
type ViewModeButtonID<State extends string> = [state: State];

type InflectionTabButtonID = [index: string];

class WordMenu {
	entries: Map<string, Partial<DictionaryEntry>[]>;
	readonly languages: Languages<LearningLanguage>;

	readonly navigation: MenuNavigationData;
	readonly display: MenuDisplayData;

	readonly showButton: Discord.ButtonComponent | undefined;

	displayed: boolean;

	constructor({
		sectionType,
		searchLanguages,
		showButton,
	}: {
		sectionType?: SectionType;
		searchLanguages: Languages<LearningLanguage>;
		showButton: Discord.ButtonComponent | undefined;
	}) {
		this.entries = new Map();
		this.languages = searchLanguages;

		this.navigation = {
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
		};
		this.display = {
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
			expanded: false,
			simplified: sectionType !== undefined,
			sectionType,
		};

		this.showButton = showButton;

		this.displayed = false;
	}

	async receiveResult(result: QueryResult): Promise<void> {
		if (result.entries === undefined) {
			return;
		}

		const desiredFields = [
			...requiredDictionaryEntryFields,
			"partOfSpeech",
			...(this.display.sectionType !== undefined
				? provisionsBySection[this.display.sectionType].map((provision) => provisionToField[provision])
				: []),
		];

		const entriesByPartOfSpeech = new Map<string, Partial<DictionaryEntry>[]>();
		for (const entry of result.entries) {
			if (this.display.simplified) {
				for (const key of Object.keys(entry) as DictionaryEntryField[]) {
					if (!desiredFields.includes(key)) {
						delete entry[key];
					}
				}
			}

			const partOfSpeech =
				entry.partOfSpeech !== undefined ? entry.partOfSpeech.detected ?? entry.partOfSpeech.value : "unknown";

			if (entriesByPartOfSpeech.has(partOfSpeech)) {
				entriesByPartOfSpeech.get(partOfSpeech)?.push(entry);
			} else {
				entriesByPartOfSpeech.set(partOfSpeech, [entry]);
			}
		}

		for (const [partOfSpeech, entries] of entriesByPartOfSpeech) {
			if (!this.entries.has(partOfSpeech)) {
				this.entries.set(partOfSpeech, entries);
				continue;
			}

			const existingEntries = this.entries.get(partOfSpeech);
			if (existingEntries === undefined) {
				throw "StateError: Existing entries unexpectedly undefined.";
			}

			for (const index of Array(entries.length).keys()) {
				const next = entries[index];
				if (next === undefined) {
					throw `StateError: Entry at index ${index} for part of speech ${partOfSpeech} unexpectedly undefined.`;
				}

				const previous = existingEntries[index];
				if (previous === undefined) {
					existingEntries[index] = next;
					continue;
				}

				// TODO(vxern): Combine results where possible.

				existingEntries[index] = {
					sources: [...(previous.sources ?? []), ...(next.sources ?? [])],
					lemma: previous.lemma,
					partOfSpeech: previous.partOfSpeech,
					definitions: previous.definitions ?? next.definitions,
					translations: previous.translations ?? next.translations,
					relations: previous.relations ?? next.relations,
					syllables: previous.syllables ?? next.syllables,
					pronunciation: previous.pronunciation ?? next.pronunciation,
					rhymes: previous.rhymes ?? next.rhymes,
					audio: previous.audio ?? next.audio,
					expressions: previous.expressions ?? next.expressions,
					examples: previous.examples ?? next.examples,
					frequency: previous.frequency ?? next.frequency,
					inflection: previous.inflection ?? next.inflection,
					etymology: previous.etymology ?? next.etymology,
					notes: previous.notes ?? next.notes,
				};
			}
		}
	}

	async updateView(
		[client, bot]: [Client, Discord.Bot],
		interaction: Logos.Interaction,
		{ locale }: { locale: Locale },
	): Promise<void> {
		let partOfSpeech: string;
		if (this.navigation.page.partOfSpeech !== undefined) {
			partOfSpeech = this.navigation.page.partOfSpeech;
		} else {
			const partOfSpeechInitial = Array.from(this.entries.keys()).at(0);
			if (partOfSpeechInitial === undefined) {
				return;
			}

			this.navigation.page.partOfSpeech = partOfSpeechInitial;
			partOfSpeech = partOfSpeechInitial;
		}

		const entry = this.entries.get(partOfSpeech)?.at(this.navigation.page.index);
		if (entry === undefined) {
			return;
		}

		const menus = this.getMenus(client, entry, { locale });
		if (this.navigation.menu.current === undefined || !(this.navigation.menu.current in menus)) {
			const firstMenu = Object.keys(menus).at(0) as MenuTab | undefined;
			if (firstMenu === undefined) {
				return;
			}

			this.navigation.menu.current = firstMenu;
		}

		const menu = menus[this.navigation.menu.current];
		if (menu === undefined) {
			return;
		}

		if (entry.lemma !== undefined || entry.partOfSpeech !== undefined) {
			const fields: string[] = [];

			if (entry.lemma !== undefined) {
				fields.push(`**${getLemmaFieldFormatted(entry.lemma)}**`);
			}

			if (entry.partOfSpeech !== undefined) {
				fields.push(`*${withTextStylingDisabled(getPartOfSpeechFieldFormatted(entry.partOfSpeech))}*`);
			}

			const embed = menu.at(0);
			if (embed === undefined) {
				return;
			}

			embed.description = fields.join(constants.symbols.sigils.separator);
		}

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

			menu.unshift(sourceEmbed);
		}

		const controls = this.getControls([client, bot], interaction, { menus, entry }, { locale });

		this.displayed = true;

		await editReply([client, bot], interaction, { embeds: menu, components: controls });
	}

	getMenus(
		client: Client,
		entry: Partial<DictionaryEntry>,
		{ locale }: { locale: Locale },
	): Partial<Record<MenuTab, Discord.CamelizedDiscordEmbed[]>> {
		const menus: Partial<Record<MenuTab, Discord.CamelizedDiscordEmbed[]>> = {};

		const overviewViews: ViewTab[] = [];
		const usageViews: ViewTab[] = [];

		let definitionField: Discord.CamelizedDiscordEmbedField | undefined;
		if (entry.definitions !== undefined && !areFieldsEmpty(entry.definitions)) {
			const definitionsAll = getMeaningFieldsFormatted(
				client,
				entry.definitions,
				{ expanded: this.display.expanded },
				{ locale },
			);
			const definitionsFitted = distributeEntries(
				definitionsAll,
				this.display.expanded ? defaults.DEFINITIONS_PER_EXPANDED_VIEW : defaults.DEFINITIONS_PER_VIEW,
			);
			this.display.view.pageCounts.definitions = definitionsFitted.length;

			const strings = {
				definitions: localise(client, "word.strings.fields.definitions", locale)(),
			};

			const view = definitionsFitted.at(this.navigation.view.definitions);
			if (view !== undefined) {
				definitionField = {
					name: `${constants.symbols.word.definitions} ${strings.definitions}`,
					value: view,
				};
			}
		}

		let translationField: Discord.CamelizedDiscordEmbedField | undefined;
		if (entry.translations !== undefined && !areFieldsEmpty(entry.translations)) {
			const translationsAll = getMeaningFieldsFormatted(
				client,
				entry.translations,
				{ expanded: this.display.expanded },
				{ locale },
			);
			const translationsFitted = distributeEntries(
				translationsAll,
				this.display.expanded ? defaults.TRANSLATIONS_PER_EXPANDED_VIEW : defaults.TRANSLATIONS_PER_VIEW,
			);
			this.display.view.pageCounts.translations = translationsFitted.length;

			const strings = {
				translations: localise(client, "word.strings.fields.translations", locale)(),
			};

			const view = translationsFitted.at(this.navigation.view.translations);
			if (view !== undefined) {
				translationField = {
					name: `${constants.symbols.word.translations} ${strings.translations}`,
					value: view,
				};
			}
		}

		let expressionField: Discord.CamelizedDiscordEmbedField | undefined;
		if (entry.expressions !== undefined && !areFieldsEmpty(entry.expressions)) {
			const expressionsAll = getExpressionFieldsFormatted(client, entry.expressions, { locale });
			const expressionsFitted = distributeEntries(
				expressionsAll,
				this.display.expanded ? defaults.EXPRESSIONS_PER_EXPANDED_VIEW : defaults.EXPRESSIONS_PER_VIEW,
			);
			this.display.view.pageCounts.expressions = expressionsFitted.length;

			const strings = {
				expressions: localise(client, "word.strings.fields.expressions", locale)(),
			};

			const view = expressionsFitted.at(this.navigation.view.expressions);
			if (view !== undefined) {
				expressionField = {
					name: `${constants.symbols.word.expressions} ${strings.expressions}`,
					value: view,
				};
			}
		}

		{
			const embed: Discord.CamelizedDiscordEmbed = {
				color: constants.colors.husky,
			};

			const fields: Discord.CamelizedDiscordEmbedField[] = [];

			if (isSearchMonolingual(this.languages.source, this.languages.target)) {
				if (definitionField !== undefined) {
					fields.push(definitionField);
					overviewViews.push("definitions");
					if (
						this.display.view.pageCounts.definitions !== 0 &&
						this.navigation.view.definitions > this.display.view.pageCounts.definitions - 1
					) {
						this.navigation.view.definitions = this.display.view.pageCounts.definitions - 1;
					}
				}
			} else {
				if (translationField !== undefined) {
					fields.push(translationField);
					overviewViews.push("translations");
					if (
						this.display.view.pageCounts.translations !== 0 &&
						this.navigation.view.translations > this.display.view.pageCounts.translations - 1
					) {
						this.navigation.view.translations = this.display.view.pageCounts.translations - 1;
					}
				}
			}

			if (expressionField !== undefined) {
				fields.push(expressionField);
				overviewViews.push("expressions");
				if (
					this.display.view.pageCounts.expressions !== 0 &&
					this.navigation.view.expressions > this.display.view.pageCounts.expressions - 1
				) {
					this.navigation.view.expressions = this.display.view.pageCounts.expressions - 1;
				}
			}

			if (entry.relations !== undefined) {
				const relations = getRelationFieldsFormatted(client, entry.relations, { locale });
				if (relations !== undefined) {
					const strings = {
						relations: localise(client, "word.strings.fields.relations", locale)(),
					};

					fields.push({
						name: `${constants.symbols.word.relations} ${strings.relations}`,
						value: trim(relations.join("\n"), constants.lengths.embedField),
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
					value: trim(text, constants.lengths.embedField),
				});
			}

			if (fields.length !== 0) {
				embed.fields = fields;

				menus.overview = [embed];
			}
		}

		{
			const embed: Discord.CamelizedDiscordEmbed = {
				color: constants.colors.orangeRed,
			};

			const fields: Discord.CamelizedDiscordEmbedField[] = [];

			if (isSearchMonolingual(this.languages.source, this.languages.target)) {
				if (translationField !== undefined) {
					fields.push(translationField);
					usageViews.push("translations");
					if (
						this.display.view.pageCounts.translations !== 0 &&
						this.navigation.view.translations > this.display.view.pageCounts.translations - 1
					) {
						this.navigation.view.translations = this.display.view.pageCounts.translations - 1;
					}
				}
			} else {
				if (definitionField !== undefined) {
					fields.push(definitionField);
					usageViews.push("definitions");
					if (
						this.display.view.pageCounts.definitions !== 0 &&
						this.navigation.view.definitions > this.display.view.pageCounts.definitions - 1
					) {
						this.navigation.view.definitions = this.display.view.pageCounts.definitions - 1;
					}
				}
			}

			if (entry.examples !== undefined && !areFieldsEmpty(entry.examples)) {
				const examplesAll = getExampleFieldsFormatted(entry.examples);
				const examplesFitted = distributeEntries(
					examplesAll,
					this.display.expanded ? defaults.EXAMPLES_PER_EXPANDED_VIEW : defaults.EXAMPLES_PER_VIEW,
				);
				this.display.view.pageCounts.examples = examplesFitted.length;

				const strings = {
					examples: localise(client, "word.strings.fields.examples", locale)(),
				};

				const view = examplesFitted.at(this.navigation.view.examples);
				if (view !== undefined) {
					fields.push({
						name: `${constants.symbols.word.examples} ${strings.examples}`,
						value: withTextStylingDisabled(view),
					});
					usageViews.push("examples");
					if (
						this.display.view.pageCounts.examples !== 0 &&
						this.navigation.view.examples > this.display.view.pageCounts.examples - 1
					) {
						this.navigation.view.examples = this.display.view.pageCounts.examples - 1;
					}
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
			const embed = entry.inflection.tabs.at(this.navigation.menu.tabs.inflection);
			if (embed !== undefined) {
				menus.inflection = [embed];
			}
		}

		this.display.view.views.overview = overviewViews;
		this.display.view.views.usage = usageViews;

		return menus;
	}

	getControls(
		[client, bot]: [Client, Discord.Bot],
		interaction: Logos.Interaction,
		{
			menus,
			entry,
		}: {
			menus: Partial<Record<MenuTab, Discord.CamelizedDiscordEmbed[]>>;
			entry: Partial<DictionaryEntry>;
		},
		{ locale }: { locale: Locale },
	): Discord.MessageComponents {
		const controls: Discord.ActionRow[] = [];

		switch (this.navigation.menu.current) {
			case "overview":
			case "usage": {
				controls.push(...this.getScrollControls([client, bot], interaction, entry, { locale }));
				break;
			}
			case "inflection": {
				controls.push(...this.getInflectionControls([client, bot], interaction, entry, { locale }));
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
		for (const menu of Object.keys(menus) as MenuTab[]) {
			const buttonId = createInteractionCollector([client, bot], {
				type: Discord.InteractionTypes.MessageComponent,
				onCollect: async (selection) => {
					acknowledge([client, bot], selection);

					this.navigation.menu.current = menu;

					this.updateView([client, bot], interaction, { locale });
				},
			});

			menuButtons.push({
				type: Discord.MessageComponentTypes.Button,
				label: strings[menu],
				disabled: this.navigation.menu.current === menu,
				customId: buttonId,
				style: Discord.ButtonStyles.Primary,
			});
		}

		if (this.showButton !== undefined) {
			menuButtons.push(this.showButton);
		}

		if (menuButtons.length > 1) {
			controls.push({
				type: Discord.MessageComponentTypes.ActionRow,
				components: menuButtons as unknown as [Discord.ButtonComponent],
			});
		}

		controls.push(...this.getPaginationControls([client, bot], interaction, { locale }));

		return controls;
	}

	getPaginationControls(
		[client, bot]: [Client, Discord.Bot],
		interaction: Logos.Interaction,
		{ locale }: { locale: Locale },
	): Discord.ActionRow[] {
		const getGroups = (): DictionaryEntriesAssorted => {
			const groups = Array.from(this.entries.entries());
			const currentGroupIndex = groups.findIndex(
				([partOfSpeech, _]) => partOfSpeech === this.navigation.page.partOfSpeech,
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
			return precedentPageCount + this.navigation.page.index + 1;
		};
		const getPageCount = () => Array.from(this.entries.values()).flat().length;
		const isFirstPage = () =>
			this.navigation.page.partOfSpeech === Array.from(this.entries.keys()).at(0) && this.navigation.page.index === 0;
		const isLastPage = () =>
			this.navigation.page.partOfSpeech === Array.from(this.entries.keys()).at(-1) &&
			getPageNumber() === getPageCount();
		const isFirstInGroup = () => this.navigation.page.index === 0;
		const isLastInGroup = () =>
			this.navigation.page.partOfSpeech !== undefined &&
			this.navigation.page.index === (this.entries.get(this.navigation.page.partOfSpeech)?.length ?? 0) - 1;

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

						this.navigation.page.partOfSpeech = partOfSpeech;
						this.navigation.page.index = entries.length - 1;
					} else {
						this.navigation.page.index--;
					}

					this.navigation.view = {
						definitions: 0,
						translations: 0,
						expressions: 0,
						examples: 0,
					};
					this.navigation.menu.tabs = {
						overview: 0,
						usage: 0,
						history: 0,
						inflection: 0,
					};
				}

				this.updateView([client, bot], interaction, { locale });
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

						this.navigation.page.partOfSpeech = partOfSpeech;
						this.navigation.page.index = 0;
					} else {
						this.navigation.page.index++;
					}

					this.navigation.view = {
						definitions: 0,
						translations: 0,
						expressions: 0,
						examples: 0,
					};
					this.navigation.menu.tabs = {
						overview: 0,
						usage: 0,
						history: 0,
						inflection: 0,
					};
				}

				this.updateView([client, bot], interaction, { locale });
			},
		});

		const groups = getGroups();
		const [_, entries] = groups.current;
		const entry = entries[this.navigation.page.index];
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
			navigation: {
				next: localise(client, "word.strings.navigation.next", locale)(),
				previous: localise(client, "word.strings.navigation.previous", locale)(),
			},
		};

		if (isFirstPage() && isLastPage()) {
			return [];
		}

		return [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						label: `${constants.symbols.interactions.menu.controls.back} ${strings.navigation.previous}`,
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
						label: `${constants.symbols.interactions.menu.controls.forward} ${strings.navigation.next}`,
						disabled: isLastPage(),
						customId: nextPageButtonId,
						style: Discord.ButtonStyles.Secondary,
					},
				],
			},
		];
	}

	getScrollControls(
		[client, bot]: [Client, Discord.Bot],
		interaction: Logos.Interaction,
		entry: Partial<DictionaryEntry>,
		{ locale }: { locale: Locale },
	): Discord.ActionRow[] {
		const isFirstPage = (view?: ViewTab) =>
			view !== undefined
				? this.navigation.view[view] === 0
				: Object.values(this.navigation.view).every((index) => index === 0);
		const isLastPage = (view?: ViewTab): boolean => {
			if (this.navigation.menu.current === undefined) {
				return false;
			}

			if (view !== undefined) {
				return this.navigation.view[view] === this.display.view.pageCounts[view] - 1;
			}

			return this.display.view.views[this.navigation.menu.current].every(
				(view) => this.navigation.view[view] === this.display.view.pageCounts[view] - 1,
			);
		};
		const canBeExpanded = () =>
			entry.definitions?.some(
				(definition) =>
					definition.definitions?.length !== 0 ||
					definition.expressions?.length !== 0 ||
					definition.examples?.length !== 0 ||
					definition.relations !== undefined,
			) ||
			entry.translations?.some(
				(expression) =>
					expression.definitions?.length !== 0 ||
					expression.expressions?.length !== 0 ||
					expression.examples?.length !== 0 ||
					expression.relations !== undefined,
			) ||
			entry.expressions?.some(
				(expression) =>
					expression.expressions?.length !== 0 ||
					expression.examples?.length !== 0 ||
					expression.relations !== undefined,
			) ||
			entry.examples?.some((expression) => expression.expressions?.length !== 0);

		const scrollDownButtonId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			limit: 1,
			onCollect: async (selection) => {
				acknowledge([client, bot], selection);

				if (this.navigation.menu.current === undefined) {
					return;
				}

				if (isLastPage()) {
					return;
				}

				for (const view of this.display.view.views[this.navigation.menu.current]) {
					if (isLastPage(view)) {
						continue;
					}

					this.navigation.view[view]++;
				}

				this.updateView([client, bot], interaction, { locale });
			},
		});

		const scrollUpButtonId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			limit: 1,
			onCollect: async (selection) => {
				acknowledge([client, bot], selection);

				if (this.navigation.menu.current === undefined) {
					return;
				}

				if (isFirstPage()) {
					return;
				}

				for (const view of this.display.view.views[this.navigation.menu.current]) {
					if (isFirstPage(view)) {
						continue;
					}

					this.navigation.view[view]--;
				}

				this.updateView([client, bot], interaction, { locale });
			},
		});

		const toggleExpandedModeButtonId = createInteractionCollector([client, bot], {
			type: Discord.InteractionTypes.MessageComponent,
			limit: 1,
			onCollect: async (selection) => {
				acknowledge([client, bot], selection);

				if (selection.data === undefined) {
					this.updateView([client, bot], interaction, { locale });
					return;
				}

				const customId = selection.data.customId;
				if (customId === undefined) {
					return;
				}

				const [_, expandedString] = decodeId<ViewModeButtonID<ExpandedMode>>(customId);
				const expanded = expandedString === "true" ? true : false;

				if (this.display.expanded) {
					this.navigation.view.definitions = Math.floor(
						this.navigation.view.definitions / defaults.DEFINITIONS_PER_VIEW,
					);
					this.navigation.view.translations = Math.floor(
						this.navigation.view.translations / defaults.TRANSLATIONS_PER_VIEW,
					);
					this.navigation.view.expressions = Math.floor(
						this.navigation.view.expressions / defaults.EXPRESSIONS_PER_VIEW,
					);
					this.navigation.view.examples = Math.floor(this.navigation.view.examples / defaults.EXAMPLES_PER_VIEW);
				} else {
					this.navigation.view.definitions = this.navigation.view.definitions * defaults.DEFINITIONS_PER_VIEW;
					this.navigation.view.translations = this.navigation.view.translations * defaults.TRANSLATIONS_PER_VIEW;
					this.navigation.view.expressions = this.navigation.view.expressions * defaults.EXPRESSIONS_PER_VIEW;
					this.navigation.view.examples = this.navigation.view.examples * defaults.EXAMPLES_PER_VIEW;
				}

				this.display.expanded = expanded;

				this.updateView([client, bot], interaction, { locale });
			},
		});

		const strings = {
			modes: {
				expanded: {
					expand: localise(client, "word.strings.modes.expanded.expand", locale)(),
					contract: localise(client, "word.strings.modes.expanded.contract", locale)(),
				},
			},
			navigation: {
				up: localise(client, "word.strings.navigation.up", locale)(),
				down: localise(client, "word.strings.navigation.down", locale)(),
			},
		};

		if (isFirstPage() && isLastPage() && !canBeExpanded()) {
			return [];
		}

		return [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.Button,
						label: `${constants.symbols.interactions.menu.controls.down} ${strings.navigation.down}`,
						disabled: isLastPage(),
						customId: scrollDownButtonId,
						style: Discord.ButtonStyles.Success,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						label: `${constants.symbols.interactions.menu.controls.up} ${strings.navigation.up}`,
						disabled: isFirstPage(),
						customId: scrollUpButtonId,
						style: Discord.ButtonStyles.Success,
					},
					{
						type: Discord.MessageComponentTypes.Button,
						label: this.display.expanded ? strings.modes.expanded.contract : strings.modes.expanded.expand,
						customId: encodeId<ViewModeButtonID<ExpandedMode>>(toggleExpandedModeButtonId, [
							`${!this.display.expanded}`,
						]),
						disabled: !canBeExpanded(),
						style: Discord.ButtonStyles.Success,
					},
				],
			},
		];
	}

	getInflectionControls(
		[client, bot]: [Client, Discord.Bot],
		interaction: Logos.Interaction,
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
					this.updateView([client, bot], interaction, { locale });
					return;
				}

				const customId = selection.data?.customId;
				if (customId === undefined) {
					return;
				}

				const [_, indexString] = decodeId<InflectionTabButtonID>(customId);
				const index = Number(indexString);

				if (index >= 0 && index <= entry.inflection.tabs.length) {
					this.navigation.menu.tabs.inflection = index;
				}

				this.updateView([client, bot], interaction, { locale });
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
					disabled: this.navigation.menu.tabs.inflection === index_,
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

	private static getWeight(entry: Partial<DictionaryEntry>): number {
		return Math.max(entry.definitions?.length ?? 0, entry.translations?.length ?? 0);
	}

	sortEntries(): void {
		const entriesByPartOfSpeech = Array.from(this.entries.entries());

		for (const [_, entries] of entriesByPartOfSpeech) {
			entries.sort((a, b) => WordMenu.getWeight(b) - WordMenu.getWeight(a));
		}

		entriesByPartOfSpeech.sort(([_, a], [__, b]) => {
			const [entryA, entryB] = [a.at(0), b.at(0)];
			if (entryA === undefined && entryB === undefined) {
				return 0;
			} else if (entryA === undefined) {
				return 1;
			} else if (entryB === undefined) {
				return -1;
			}

			return WordMenu.getWeight(entryB) - WordMenu.getWeight(entryA);
		});

		this.entries = new Map(entriesByPartOfSpeech);
	}
}

function isFieldEmpty(field: LabelledField): boolean {
	return (field.labels === undefined || field.labels.length === 0) && field.value.length === 0;
}

function areFieldsEmpty(fields: LabelledField[]): boolean {
	return fields.length === 0 || fields.some((field) => isFieldEmpty(field));
}

function getLabelledFieldFormatted(value: string, labels?: string[]): string {
	if (labels !== undefined && labels.length !== 0) {
		const labelsFormatted = labels.map((label) => code(label)).join(" ");
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

function getMeaningFieldsFormatted(
	client: Client,
	fields: MeaningField[],
	{ expanded }: { expanded: boolean },
	{ locale }: { locale: Locale },
	stack?: { depth: number },
): string[] {
	return fields
		.map((field) => getMeaningFieldFormatted(client, field, { expanded }, { locale }, stack))
		.map((entry, index) => `${index + 1}. ${entry}`)
		.map((entry) => {
			const depth = stack?.depth ?? 0;
			const whitespace = constants.symbols.meta.whitespace.repeat(depth * defaults.ROW_INDENTATION);
			return `${whitespace}${entry}`;
		});
}

function getMeaningFieldFormatted(
	client: Client,
	field: MeaningField,
	{ expanded }: { expanded: boolean },
	{ locale }: { locale: Locale },
	stack?: { depth: number },
): string {
	let root = getLabelledFieldFormatted(field.value, field.labels);

	if ((stack === undefined || stack.depth === 0) && !expanded) {
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
		const branch = getMeaningFieldsFormatted(
			client,
			field.definitions,
			{ expanded },
			{ locale },
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

	if (field.examples !== undefined && field.examples.length !== 0) {
		const branch = getExampleFieldsFormatted(
			field.examples,
			stack !== undefined ? { depth: stack.depth + 1 } : { depth: 1 },
		);

		root = `${root}\n${branch.join("\n")}`;
	}

	return root;
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
			const whitespace = constants.symbols.meta.whitespace.repeat(depth * defaults.ROW_INDENTATION);
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
		const whitespace = constants.symbols.meta.whitespace.repeat(depth * defaults.ROW_INDENTATION);
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
		if (synonyms.length !== 0) {
			rows.push(`**${strings.synonyms}**: ${synonyms.join(", ")}`);
		}

		if (antonyms.length !== 0) {
			rows.push(`**${strings.antonyms}**: ${antonyms.join(", ")}`);
		}
	}

	if (diminutives.length !== 0 || augmentatives.length !== 0) {
		if (diminutives.length !== 0) {
			rows.push(`**${strings.diminutives}**: ${diminutives.join(", ")}`);
		}

		if (augmentatives.length !== 0) {
			rows.push(`**${strings.augmentatives}**: ${augmentatives.join(", ")}`);
		}
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

function getExampleFieldsFormatted(fields: ExampleField[], stack?: { depth: number }): string[] {
	return fields
		.map((field) => `> - ${getLabelledFieldFormatted(field.value, field.labels)}`)
		.map((entry) => {
			const depth = stack?.depth ?? 0;
			const whitespace = constants.symbols.meta.whitespace.repeat(depth * defaults.ROW_INDENTATION);
			return `${whitespace}${entry}`;
		});
}

function getFrequencyFieldFormatted(field: FrequencyField): string {
	return `${(field.value * 100).toFixed(1)}%`;
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

export { handleGetInformationAutocomplete as handleFindWordAutocomplete, verifyIsLemmaValid };
export default commands;
