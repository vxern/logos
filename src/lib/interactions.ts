import * as Discord from "@discordeno/bot";
import { DiscordSnowflake as Snowflake } from "@sapphire/snowflake";
import constants from "../constants/constants";
import {
	FeatureLanguage,
	LearningLanguage,
	Locale,
	LocalisationLanguage,
	getDiscordLocalisationLanguageByLocale,
	getLocaleByLocalisationLanguage,
} from "../constants/languages";
import time from "../constants/time";
import symbols from "../constants/types/symbols";
import defaults from "../defaults";
import * as Logos from "../types";
import { InteractionLocaleData } from "../types";
import { Client, addCollector, localise, pluralise } from "./client";
import { Document } from "./database/document";
import { Guild } from "./database/structs/guild";
import { InteractionRepetitionButtonID } from "./services/interaction-repetition/interaction-repetition";

type AutocompleteInteraction = Discord.Interaction & { type: Discord.InteractionTypes.ApplicationCommandAutocomplete };

function isAutocomplete(interaction: Discord.Interaction): interaction is AutocompleteInteraction {
	return interaction.type === Discord.InteractionTypes.ApplicationCommandAutocomplete;
}

/** Settings for interaction collection. */
interface InteractionCollectorSettings {
	/** The type of interaction to listen for. */
	type: Discord.InteractionTypes;

	/**
	 * The accepted respondent to the collector. If unset, any user will be able
	 * to respond.
	 */
	userId?: bigint;

	/** The ID of the interaction to listen for. */
	customId?: string;

	/** Whether this collector is to last forever or not. */
	doesNotExpire?: boolean;

	/** How many interactions to collect before de-initialising. */
	limit?: number;

	onCollect?: (...args: Parameters<Discord.EventHandlers["interactionCreate"]>) => void;
	onEnd?: () => void;
}

/**
 * Taking a {@link Client} and {@link InteractionCollectorSettings}, creates an
 * interaction collector.
 */
function createInteractionCollector(
	[client, bot]: [Client, Discord.Bot],
	settings: InteractionCollectorSettings,
): string {
	const customId = settings.customId ?? Snowflake.generate().toString();

	addCollector([client, bot], "interactionCreate", {
		filter: (interaction) => compileChecks(interaction, settings, customId).every((condition) => condition),
		limit: settings.limit,
		removeAfter: settings.doesNotExpire ? undefined : constants.INTERACTION_TOKEN_EXPIRY,
		onCollect: settings.onCollect ?? (() => {}),
		onEnd: settings.onEnd ?? (() => {}),
	});

	return customId;
}

function compileChecks(
	interaction: Discord.Interaction,
	settings: InteractionCollectorSettings,
	customId: string,
): boolean[] {
	return [
		interaction.type === settings.type,
		interaction.data !== undefined &&
			interaction.data.customId !== undefined &&
			decodeId(interaction.data.customId)[0] === decodeId(customId)[0],
		settings.userId === undefined ? true : interaction.user.id === settings.userId,
	];
}

type CustomTypeIndicators = Record<string, "number" | "boolean">;
type CustomTypeIndicatorsTyped<C extends CustomTypeIndicators> = {
	[key in keyof C]: (C[key] extends "number" ? number : boolean) | undefined;
};

function parseArguments<
	T extends Record<string, string | undefined>,
	R extends CustomTypeIndicatorsTyped<C> & T,
	C extends Record<string, "number" | "boolean">,
>(
	options: Discord.InteractionDataOption[] | undefined,
	customTypes: C,
): [R, Discord.InteractionDataOption | undefined] {
	let args: Record<string, unknown> = {};

	let focused: Discord.InteractionDataOption | undefined = undefined;
	for (const option of options ?? []) {
		if (option.focused) {
			focused = option;
		}

		if (option.options !== undefined) {
			const [parsedArgs, parsedFocused] = parseArguments(option.options, customTypes);
			focused = parsedFocused ?? focused;
			args = { ...args, ...parsedArgs };
			continue;
		}

		if (option.value === undefined) {
			args[option.name] = undefined;
			continue;
		}

		switch (customTypes[option.name]) {
			case "boolean": {
				args[option.name] = option.value as boolean;
				continue;
			}
			case "number": {
				args[option.name] = parseInt(option.value as string);
				continue;
			}
		}

		args[option.name] = option.value as string;
	}

	return [args as R, focused];
}

type ControlButtonID = [type: "previous" | "next"];

/**
 * Paginates an array of elements, allowing the user to browse between pages
 * in an embed view.
 */
async function paginate<T>(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
	{
		elements,
		embed,
		view,
		show,
		showable,
	}: {
		elements: T[];
		embed: Omit<Discord.CamelizedDiscordEmbed, "footer">;
		view: PaginationDisplayData<T>;
		show: boolean;
		showable: boolean;
	},
	{ locale }: { locale: Locale },
): Promise<void> {
	const data: PaginationData<T> = { elements, view, pageIndex: 0 };

	const showButton = getShowButton(client, interaction, { locale });

	const isFirst = () => data.pageIndex === 0;
	const isLast = () => data.pageIndex === data.elements.length - 1;

	const getView = (): Discord.InteractionCallbackData => {
		const buttons = generateButtons(customId, isFirst(), isLast());

		if (showable && !show) {
			buttons.push({ type: Discord.MessageComponentTypes.ActionRow, components: [showButton] });
		}

		return {
			embeds: [getPageEmbed(client, data, embed, isLast(), locale)],
			components: buttons,
		};
	};

	const customId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		doesNotExpire: true,
		onCollect: async (selection) => {
			acknowledge([client, bot], selection);

			const customId = selection.data?.customId;
			if (customId === undefined) {
				return;
			}

			const [_, action] = decodeId<ControlButtonID>(customId);

			switch (action) {
				case "previous": {
					if (!isFirst()) {
						data.pageIndex--;
					}
					break;
				}
				case "next": {
					if (!isLast()) {
						data.pageIndex++;
					}
					break;
				}
			}

			editReply([client, bot], interaction, getView());
		},
	});

	reply([client, bot], interaction, getView(), { visible: show });
}

interface PaginationDisplayData<T> {
	readonly title: string;
	readonly generate: (element: T, index: number) => string;
}

interface PaginationData<T> {
	readonly elements: T[];
	readonly view: PaginationDisplayData<T>;

	pageIndex: number;
}

function getPageEmbed<T>(
	client: Client,
	data: PaginationData<T>,
	embed: Discord.CamelizedDiscordEmbed,
	isLast: boolean,
	locale: Locale,
): Discord.CamelizedDiscordEmbed {
	const strings = {
		page: localise(client, "interactions.page", locale)(),
		continuedOnNextPage: localise(client, "interactions.continuedOnNextPage", locale)(),
	};

	const elements = data.elements.at(data.pageIndex);
	if (elements === undefined) {
		throw `StateError: Failed to get elements on page with index '${data.pageIndex}'.`;
	}

	return {
		...embed,
		title:
			data.elements.length === 1
				? data.view.title
				: `${data.view.title} ~ ${strings.page} ${data.pageIndex + 1}/${data.elements.length}`,
		description: data.view.generate(elements, data.pageIndex),
		footer: isLast ? undefined : { text: strings.continuedOnNextPage },
	};
}

function generateButtons(customId: string, isFirst: boolean, isLast: boolean): Discord.MessageComponents {
	return [
		{
			type: Discord.MessageComponentTypes.ActionRow,
			components: [
				{
					type: Discord.MessageComponentTypes.Button,
					customId: encodeId<ControlButtonID>(customId, ["previous"]),
					disabled: isFirst,
					style: Discord.ButtonStyles.Secondary,
					label: constants.symbols.interactions.menu.controls.back,
				},
				{
					type: Discord.MessageComponentTypes.Button,
					customId: encodeId<ControlButtonID>(customId, ["next"]),
					disabled: isLast,
					style: Discord.ButtonStyles.Secondary,
					label: constants.symbols.interactions.menu.controls.forward,
				},
			],
		},
	];
}

type ComposerActionRow<ComposerContent extends Record<string, unknown>, SectionNames = keyof ComposerContent> = {
	type: Discord.MessageComponentTypes.ActionRow;
	components: [
		Discord.ActionRow["components"][0] & { type: Discord.MessageComponentTypes.InputText; customId: SectionNames },
	];
};

type Modal<ComposerContent extends Record<string, string>, SectionNames = keyof ComposerContent> = {
	title: string;
	fields: ComposerActionRow<ComposerContent, SectionNames>[];
};

async function createModalComposer<
	ComposerContent extends Record<string, string>,
	SectionNames extends keyof ComposerContent = keyof ComposerContent,
>(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	{
		onSubmit,
		onInvalid,
		modal,
	}: {
		onSubmit: (submission: Discord.Interaction, data: ComposerContent) => Promise<true | string>;
		onInvalid: (submission: Discord.Interaction, error?: string) => Promise<Discord.Interaction | undefined>;
		modal: Modal<ComposerContent, SectionNames>;
	},
): Promise<void> {
	const fields = structuredClone(modal.fields);

	let anchor = interaction;
	let content: ComposerContent | undefined = undefined;

	let isSubmitting = true;
	while (isSubmitting) {
		const [submission, result] = await new Promise<[Discord.Interaction, boolean | string]>((resolve) => {
			const modalId = createInteractionCollector([client, bot], {
				type: Discord.InteractionTypes.ModalSubmit,
				userId: interaction.user.id,
				limit: 1,
				onCollect: async (submission) => {
					content = parseComposerContent(submission);
					if (content === undefined) {
						return resolve([submission, false]);
					}

					const result = await onSubmit(submission, content);

					resolve([submission, result]);
				},
			});

			if (content !== undefined) {
				const answers = Object.values(content) as (string | undefined)[];
				for (const [value, index] of answers.map<[string | undefined, number]>((v, i) => [v, i])) {
					const field = fields[index];
					if (field === undefined) {
						throw `StateError: The number of modal fields (${fields.length}) does not correspond to the number of answers (${answers.length}).`;
					}

					field.components[0].value = value;
				}
			}

			displayModal([client, bot], anchor, {
				title: modal.title,
				customId: modalId,
				components: fields,
			});
		});

		if (typeof result === "boolean" && result) {
			isSubmitting = false;
			break;
		}

		const newAnchor = await (typeof result === "string" ? onInvalid(submission, result) : onInvalid(submission));
		if (newAnchor === undefined) {
			isSubmitting = false;
			break;
		}

		anchor = newAnchor;
	}
}

function parseComposerContent<
	ComposerContent extends Record<string, string>,
	SectionNames extends keyof ComposerContent = keyof ComposerContent,
>(submission: Discord.Interaction): ComposerContent | undefined {
	const content: Partial<ComposerContent> = {};

	const fields = submission?.data?.components?.map((component) => component.components?.at(0));
	if (fields === undefined) {
		return;
	}

	for (const field of fields) {
		if (field === undefined) {
			continue;
		}

		const key = field.customId as SectionNames;
		const value = (field.value ?? "") as ComposerContent[SectionNames];

		if (value.length === 0) {
			content[key] = undefined;
		} else {
			content[key] = value;
		}
	}

	return content as ComposerContent;
}

// Expression to detect HH:MM:SS, MM:SS and SS timestamps.
const conciseTimeExpression = new RegExp(
	/^(?:(?:(0?[0-9]|1[0-9]|2[0-4]):)?(?:(0?[0-9]|[1-5][0-9]|60):))?(0?[0-9]|[1-5][0-9]|60)$/,
);

function parseTimeExpression(
	client: Client,
	expression: string,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): [correctedExpression: string, period: number] | undefined {
	const conciseMatch = conciseTimeExpression.exec(expression) ?? undefined;
	if (conciseMatch !== undefined) {
		const [_, hours, minutes, seconds] = conciseMatch;
		if (seconds === undefined) {
			throw `StateError: The expression '${conciseTimeExpression}' was matched to the concise timestamp regular expression, but the seconds part was \`undefined\`.`;
		}

		return parseConciseTimeExpression(client, [hours, minutes, seconds], { language, locale });
	}

	return parseVerboseTimeExpressionPhrase(client, expression, { language, locale });
}

function parseConciseTimeExpression(
	client: Client,
	parts: [hours: string | undefined, minutes: string | undefined, seconds: string],
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): ReturnType<typeof parseTimeExpression> {
	const [seconds, minutes, hours] = parts.map((part) => (part !== undefined ? Number(part) : undefined)).reverse() as [
		number,
		...number[],
	];

	const verboseExpressionParts = [];
	if (seconds !== 0) {
		const strings = {
			second: pluralise(client, "units.second.word", language, seconds),
		};

		verboseExpressionParts.push(strings.second);
	}
	if (minutes !== undefined && minutes !== 0) {
		const strings = {
			minute: pluralise(client, "units.minute.word", language, minutes),
		};

		verboseExpressionParts.push(strings.minute);
	}
	if (hours !== undefined && hours !== 0) {
		const strings = {
			hour: pluralise(client, "units.hour.word", language, hours),
		};

		verboseExpressionParts.push(strings.hour);
	}
	const verboseExpression = verboseExpressionParts.join(" ");

	const expressionParsed = parseVerboseTimeExpressionPhrase(client, verboseExpression, { language, locale });
	if (expressionParsed === undefined) {
		return undefined;
	}

	const conciseExpression = parts
		.map((part) => part ?? "0")
		.map((part) => (part.length === 1 ? `0${part}` : part))
		.join(":");

	const [verboseExpressionCorrected, period] = expressionParsed;

	return [`${conciseExpression} (${verboseExpressionCorrected})`, period];
}

type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month" | "year";
const timeUnitToPeriod: Required<Record<TimeUnit, number>> = {
	second: time.second,
	minute: time.minute,
	hour: time.hour,
	day: time.day,
	week: time.week,
	month: time.month,
	year: time.year,
};

const timeUnitsWithAliasesLocalised = new Map<string, Record<TimeUnit, string[]>>();

function parseVerboseTimeExpressionPhrase(
	client: Client,
	expression: string,
	{ language, locale }: { language: LocalisationLanguage; locale: Locale },
): ReturnType<typeof parseTimeExpression> {
	if (!timeUnitsWithAliasesLocalised.has(locale)) {
		const timeUnits = Object.keys(timeUnitToPeriod) as TimeUnit[];
		const timeUnitAliasTuples: [TimeUnit, string[]][] = [];

		for (const timeUnit of timeUnits) {
			timeUnitAliasTuples.push([
				timeUnit,
				[
					`units.${timeUnit}.one`,
					`units.${timeUnit}.two`,
					`units.${timeUnit}.many`,
					`units.${timeUnit}.short`,
					`units.${timeUnit}.shortest`,
				].map((key) => localise(client, key, locale)()),
			]);
		}

		timeUnitsWithAliasesLocalised.set(locale, Object.fromEntries(timeUnitAliasTuples) as Record<TimeUnit, string[]>);
	}

	const timeUnitsWithAliases = timeUnitsWithAliasesLocalised.get(locale);
	if (timeUnitsWithAliases === undefined) {
		throw `Failed to get time unit aliases for locale '${locale}'.`;
	}

	function extractNumbers(expression: string): number[] {
		const digitsExpression = new RegExp(/\d+/g);
		return (expression.match(digitsExpression) ?? []).map((digits) => Number(digits));
	}

	function extractStrings(expression: string): string[] {
		const stringsExpression = new RegExp(/\p{L}+/gu);
		return expression.match(stringsExpression) ?? [];
	}

	// Extract the digits present in the expression.
	const quantifiers = extractNumbers(expression).map((string) => Number(string));
	// Extract the strings present in the expression.
	const timeUnitAliases = extractStrings(expression);

	// No parameters have been provided for both keys and values.
	if (timeUnitAliases.length === 0 || quantifiers.length === 0) {
		return undefined;
	}

	// The number of values does not match the number of keys.
	if (quantifiers.length !== timeUnitAliases.length) {
		return undefined;
	}

	// One of the values is equal to 0.
	if (quantifiers.includes(0)) {
		return undefined;
	}

	const timeUnits: TimeUnit[] = [];
	for (const timeUnitAlias of timeUnitAliases) {
		const timeUnit = Object.entries(timeUnitsWithAliases).find(([_, aliases]) => aliases.includes(timeUnitAlias))?.[0];

		// TODO(vxern): Convey to the user that a time unit is invalid.
		if (timeUnit === undefined) {
			return undefined;
		}

		timeUnits.push(timeUnit as TimeUnit);
	}

	// If one of the keys is duplicate.
	if (new Set(timeUnits).size !== timeUnits.length) {
		return undefined;
	}

	const timeUnitQuantifierTuples: [TimeUnit, number][] = [];
	for (const [timeUnit, quantifier] of timeUnits.map<[TimeUnit, number | undefined]>((timeUnit, index) => [
		timeUnit,
		quantifiers[index],
	])) {
		if (quantifier === undefined) {
			throw `Failed to get quantifier for time unit '${timeUnit}' and locale '${locale}'.`;
		}

		timeUnitQuantifierTuples.push([timeUnit, quantifier]);
	}
	timeUnitQuantifierTuples.sort(([previous], [next]) => timeUnitToPeriod[next] - timeUnitToPeriod[previous]);

	const timeExpressions = [];
	let total = 0;
	for (const [timeUnit, quantifier] of timeUnitQuantifierTuples) {
		const strings = {
			unit: pluralise(client, `units.${timeUnit}.word`, language, quantifier),
		};

		timeExpressions.push(strings.unit);

		total += quantifier * timeUnitToPeriod[timeUnit];
	}
	const correctedExpression = timeExpressions.join(", ");

	return [correctedExpression, total];
}

type ComponentIDMetadata = [arg: string, ...args: string[]];

function encodeId<T extends ComponentIDMetadata>(customId: string, args: T): string {
	return [customId, ...args].join(constants.symbols.meta.idSeparator);
}

function decodeId<T extends ComponentIDMetadata, R = [string, ...T]>(customId: string): R {
	return customId.split(constants.symbols.meta.idSeparator) as R;
}

async function acknowledge(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction | Discord.Interaction,
): Promise<void> {
	return bot.rest
		.sendInteractionResponse(interaction.id, interaction.token, {
			type: Discord.InteractionResponseTypes.DeferredUpdateMessage,
		})
		.catch((reason) => client.log.warn("Failed to acknowledge interaction:", reason));
}

async function postponeReply(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction | Discord.Interaction,
	{ visible = false } = {},
): Promise<void> {
	return bot.rest
		.sendInteractionResponse(interaction.id, interaction.token, {
			type: Discord.InteractionResponseTypes.DeferredChannelMessageWithSource,
			data: visible ? {} : { flags: Discord.MessageFlags.Ephemeral },
		})
		.catch((reason) => client.log.warn("Failed to postpone reply to interaction:", reason));
}

async function reply(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction | Discord.Interaction,
	data: Omit<Discord.InteractionCallbackData, "flags">,
	{ visible = false } = {},
): Promise<void> {
	return bot.rest
		.sendInteractionResponse(interaction.id, interaction.token, {
			type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
			data: { ...data, flags: visible ? undefined : Discord.MessageFlags.Ephemeral },
		})
		.catch((reason) => client.log.warn("Failed to reply to interaction:", reason));
}

async function editReply(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction | Discord.Interaction,
	data: Omit<Discord.InteractionCallbackData, "flags">,
): Promise<void> {
	return bot.rest
		.editOriginalInteractionResponse(interaction.token, data)
		.then(() => {})
		.catch((reason) => client.log.warn("Failed to edit reply to interaction:", reason));
}

async function deleteReply(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction | Discord.Interaction,
): Promise<void> {
	return bot.rest
		.deleteOriginalInteractionResponse(interaction.token)
		.catch((reason) => client.log.warn("Failed to edit reply to interaction:", reason));
}

async function respond(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction | Discord.Interaction,
	choices: Discord.ApplicationCommandOptionChoice[],
): Promise<void> {
	return bot.rest
		.sendInteractionResponse(interaction.id, interaction.token, {
			type: Discord.InteractionResponseTypes.ApplicationCommandAutocompleteResult,
			data: { choices },
		})
		.catch((reason) => client.log.warn("Failed to respond to autocomplete interaction:", reason));
}

async function displayModal(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction | Discord.Interaction,
	data: Omit<Discord.InteractionCallbackData, "flags">,
): Promise<void> {
	return bot.rest
		.sendInteractionResponse(interaction.id, interaction.token, {
			type: Discord.InteractionResponseTypes.Modal,
			data,
		})
		.catch((reason) => client.log.warn("Failed to show modal:", reason));
}

function getLocalisationLanguage(guildDocument: Document<Guild> | undefined): LocalisationLanguage {
	return guildDocument?.data.languages?.localisation ?? defaults.LOCALISATION_LANGUAGE;
}

function getTargetLanguage(guildDocument: Document<Guild>): LocalisationLanguage {
	return guildDocument?.data.languages?.target ?? getLocalisationLanguage(guildDocument);
}

function getFeatureLanguage(guildDocument?: Document<Guild>): FeatureLanguage {
	return guildDocument?.data.languages?.feature ?? defaults.FEATURE_LANGUAGE;
}

const FALLBACK_LOCALE_DATA: InteractionLocaleData = {
	language: defaults.LOCALISATION_LANGUAGE,
	locale: defaults.LOCALISATION_LOCALE,
	learningLanguage: defaults.LEARNING_LANGUAGE,
	guildLanguage: defaults.LOCALISATION_LANGUAGE,
	guildLocale: defaults.LOCALISATION_LOCALE,
	featureLanguage: defaults.FEATURE_LANGUAGE,
};

async function getLocaleData(client: Client, interaction: Discord.Interaction): Promise<InteractionLocaleData> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return FALLBACK_LOCALE_DATA;
	}

	const member = client.cache.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${guildId}`));

	const [userDocument, guildDocument] = await Promise.all([
		client.database.adapters.users.getOrFetchOrCreate(
			client,
			"id",
			interaction.user.id.toString(),
			interaction.user.id,
		),
		client.database.adapters.guilds.getOrFetchOrCreate(client, "id", guildId.toString(), guildId),
	]);
	if (userDocument === undefined || guildDocument === undefined) {
		return FALLBACK_LOCALE_DATA;
	}

	const targetOnlyChannelIds = getTargetOnlyChannelIds(guildDocument);
	const isInTargetOnlyChannel =
		interaction.channelId !== undefined && targetOnlyChannelIds.includes(interaction.channelId);

	const targetLanguage = getTargetLanguage(guildDocument);
	const learningLanguage = getLearningLanguage(guildDocument, targetLanguage, member);

	const guildLanguage = isInTargetOnlyChannel ? targetLanguage : getLocalisationLanguage(guildDocument);
	const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
	const featureLanguage = getFeatureLanguage(guildDocument);

	if (!isAutocomplete(interaction)) {
		// If the user has configured a custom locale, use the user's preferred locale.
		if (userDocument?.data.account.language !== undefined) {
			const language = userDocument?.data.account.language;
			const locale = getLocaleByLocalisationLanguage(language);
			return { language, locale, learningLanguage, guildLanguage, guildLocale, featureLanguage };
		}
	}

	// Otherwise default to the user's app language.
	const appLocale = interaction.locale;
	const language = getDiscordLocalisationLanguageByLocale(appLocale) ?? defaults.LOCALISATION_LANGUAGE;
	const locale = getLocaleByLocalisationLanguage(language);
	return { language, locale, learningLanguage, guildLanguage, guildLocale, featureLanguage };
}

function getTargetOnlyChannelIds(guildDocument: Document<Guild>): bigint[] {
	const language = guildDocument.data.features.language;
	if (!language.enabled) {
		return [];
	}

	const targetOnly = language.features.targetOnly;
	if (targetOnly === undefined || !targetOnly.enabled) {
		return [];
	}

	return targetOnly.channelIds.map((channelId) => BigInt(channelId));
}

function getLearningLanguage(
	guildDocument: Document<Guild>,
	guildLearningLanguage: LearningLanguage,
	member: Logos.Member | undefined,
): LearningLanguage {
	if (member === undefined) {
		return guildLearningLanguage;
	}

	const language = guildDocument.data.features.language;
	if (!language.enabled) {
		return guildLearningLanguage;
	}

	const roleLanguages = language.features.roleLanguages;
	if (roleLanguages === undefined || !roleLanguages.enabled) {
		return guildLearningLanguage;
	}

	const userLearningLanguage = Object.entries(roleLanguages.ids).find(([key, _]) =>
		member.roles.includes(BigInt(key)),
	)?.[1];
	if (userLearningLanguage === undefined) {
		return guildLearningLanguage;
	}

	return userLearningLanguage;
}

function getShowButton(
	client: Client,
	interaction: Logos.Interaction,
	{ locale }: { locale: Locale },
): Discord.ButtonComponent {
	const strings = {
		show: localise(client, "interactions.show", locale)(),
	};

	return {
		type: Discord.MessageComponentTypes.Button,
		style: Discord.ButtonStyles.Primary,
		label: strings.show,
		emoji: { name: symbols.showInChat },
		customId: encodeId<InteractionRepetitionButtonID>(constants.components.showInChat, [interaction.id.toString()]),
	};
}

function isSubcommandGroup(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommandGroup;
}

function isSubcommand(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommand;
}

function getCommandName(interaction: Discord.Interaction | Logos.Interaction): string | undefined {
	const commandName = interaction.data?.name;
	if (commandName === undefined) {
		return;
	}

	const subCommandGroupOption = interaction.data?.options?.find((option) => isSubcommandGroup(option));

	let commandNameFull: string;
	if (subCommandGroupOption !== undefined) {
		const subCommandGroupName = subCommandGroupOption.name;
		const subCommandName = subCommandGroupOption.options?.find((option) => isSubcommand(option))?.name;
		if (subCommandName === undefined) {
			return;
		}

		commandNameFull = `${commandName} ${subCommandGroupName} ${subCommandName}`;
	} else {
		const subCommandName = interaction.data?.options?.find((option) => isSubcommand(option))?.name;
		if (subCommandName === undefined) {
			commandNameFull = commandName;
		} else {
			commandNameFull = `${commandName} ${subCommandName}`;
		}
	}

	return commandNameFull;
}

export {
	acknowledge,
	createInteractionCollector,
	createModalComposer,
	decodeId,
	deleteReply,
	editReply,
	encodeId,
	generateButtons,
	getLocalisationLanguage,
	isAutocomplete,
	paginate,
	parseArguments,
	getLocaleData,
	parseTimeExpression,
	postponeReply,
	reply,
	respond,
	getShowButton,
	getFeatureLanguage,
	getCommandName,
};
export type { ControlButtonID, InteractionCollectorSettings, Modal };
