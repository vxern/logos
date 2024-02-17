import * as Discord from "@discordeno/bot";
import constants from "../constants/constants";
import {
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
import { Client, InteractionCollector } from "./client";
import { Guild } from "./database/guild";
import { User } from "./database/user";
import { InteractionRepetitionButtonID } from "./services/interaction-repetition/interaction-repetition";

type AutocompleteInteraction = Discord.Interaction & { type: Discord.InteractionTypes.ApplicationCommandAutocomplete };

function isAutocomplete(interaction: Discord.Interaction | Logos.Interaction): interaction is AutocompleteInteraction {
	return interaction.type === Discord.InteractionTypes.ApplicationCommandAutocomplete;
}

type CustomTypeIndicators = Record<string, "number" | "boolean">;
type CustomTypeIndicatorsTyped<C extends CustomTypeIndicators> = {
	[key in keyof C]: (C[key] extends "number" ? number : boolean) | undefined;
};

// TODO(vxern): Do this better.
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

type SkipAction = "previous" | "next";
type ControlButtonID = [type: SkipAction];

/**
 * Paginates an array of elements, allowing the user to browse between pages
 * in an embed view.
 */
async function paginate<T>(
	client: Client,
	interaction: Logos.Interaction,
	{
		getElements,
		embed,
		view,
		show,
		showable,
	}: {
		getElements: () => T[];
		embed: Omit<Discord.CamelizedDiscordEmbed, "footer">;
		view: PaginationDisplayData<T>;
		show: boolean;
		showable: boolean;
	},
	{ locale }: { locale: Locale },
): Promise<() => Promise<void>> {
	const buttonPresses = new InteractionCollector({ isPermanent: true });

	const data: PaginationData<T> = { elements: getElements(), view, pageIndex: 0 };

	const showButton = getShowButton(client, interaction, { locale });

	const isFirst = () => data.pageIndex === 0;
	const isLast = () => data.pageIndex === data.elements.length - 1;

	const getView = (): Discord.InteractionCallbackData => {
		const buttons = generateButtons(buttonPresses.customId, isFirst(), isLast());

		if (showable && !show) {
			buttons.push({ type: Discord.MessageComponentTypes.ActionRow, components: [showButton] });
		}

		return {
			embeds: [getPageEmbed(client, data, embed, isLast(), locale)],
			components: buttons,
		};
	};

	const editView = async (action?: SkipAction) => {
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

		client.editReply(interaction, getView());
	};

	buttonPresses.onCollect(async (buttonPress) => {
		client.acknowledge(buttonPress);

		const customId = buttonPress.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [_, action] = decodeId<ControlButtonID>(customId);

		await editView(action);
	});

	client.registerInteractionCollector(buttonPresses);

	client.reply(interaction, getView(), { visible: show });

	return async () => {
		data.elements = getElements();
		editView();
	};
}

interface PaginationDisplayData<T> {
	readonly title: string;
	readonly generate: (element: T, index: number) => string;
}

interface PaginationData<T> {
	elements: T[];
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
		page: client.localise("interactions.page", locale)(),
		continuedOnNextPage: client.localise("interactions.continuedOnNextPage", locale)(),
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

type ComposerActionRow<ComposerContent, SectionNames = keyof ComposerContent> = {
	type: Discord.MessageComponentTypes.ActionRow;
	components: [
		Discord.ActionRow["components"][0] & { type: Discord.MessageComponentTypes.InputText; customId: SectionNames },
	];
};

type Modal<ComposerContent, SectionNames = keyof ComposerContent> = {
	title: string;
	fields: ComposerActionRow<ComposerContent, SectionNames>[];
};

// TODO(vxern): This can absolutely be improved.
async function createModalComposer<ComposerContent, SectionNames extends keyof ComposerContent = keyof ComposerContent>(
	client: Client,
	interaction: Logos.Interaction,
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

	let anchor: Discord.Interaction | Logos.Interaction = interaction;
	let content: ComposerContent | undefined = undefined;

	let isSubmitting = true;
	while (isSubmitting) {
		const { promise, resolve } = Promise.withResolvers<[Discord.Interaction, boolean | string]>();

		const modalSubmits = new InteractionCollector({
			type: Discord.InteractionTypes.ModalSubmit,
			only: [interaction.user.id],
			isSingle: true,
		});

		modalSubmits.onCollect(async (modalSubmit) => {
			content = parseComposerContent(modalSubmit);
			if (content === undefined) {
				return resolve([modalSubmit, false]);
			}

			const result = await onSubmit(modalSubmit, content);

			resolve([modalSubmit, result]);
		});

		client.registerInteractionCollector(modalSubmits);

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

		client.displayModal(anchor, {
			title: modal.title,
			customId: modalSubmits.customId,
			components: fields,
		});

		const [submission, result] = await promise;

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

function parseComposerContent<ComposerContent, SectionNames extends keyof ComposerContent = keyof ComposerContent>(
	submission: Discord.Interaction,
): ComposerContent | undefined {
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
		const value = field.value ?? "";

		if (value.length === 0) {
			content[key] = undefined;
		} else {
			content[key] = value as ComposerContent[SectionNames];
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
			second: client.pluralise("units.second.word", language, seconds),
		};

		verboseExpressionParts.push(strings.second);
	}

	if (minutes !== undefined && minutes !== 0) {
		const strings = {
			minute: client.pluralise("units.minute.word", language, minutes),
		};

		verboseExpressionParts.push(strings.minute);
	}

	if (hours !== undefined && hours !== 0) {
		const strings = {
			hour: client.pluralise("units.hour.word", language, hours),
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
				].map((key) => client.localise(key, locale)()),
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
			unit: client.pluralise(`units.${timeUnit}.word`, language, quantifier),
		};

		timeExpressions.push(strings.unit);

		total += quantifier * timeUnitToPeriod[timeUnit];
	}
	const correctedExpression = timeExpressions.join(", ");

	return [correctedExpression, total];
}

type ComponentIDMetadata = [arg: string, ...args: string[]];

// TODO(vxern): Improve.
function encodeId<T extends ComponentIDMetadata>(customId: string, args: T): string {
	return [customId, ...args].join(constants.symbols.meta.idSeparator);
}

// TODO(vxern): Improve.
function decodeId<T extends ComponentIDMetadata, R = [string, ...T]>(customId: string): R {
	return customId.split(constants.symbols.meta.idSeparator) as R;
}

const FALLBACK_LOCALE_DATA: InteractionLocaleData = {
	language: defaults.LOCALISATION_LANGUAGE,
	locale: defaults.LOCALISATION_LOCALE,
	learningLanguage: defaults.LEARNING_LANGUAGE,
	guildLanguage: defaults.LOCALISATION_LANGUAGE,
	guildLocale: defaults.LOCALISATION_LOCALE,
	featureLanguage: defaults.FEATURE_LANGUAGE,
};

async function getLocaleData(
	client: Client,
	interaction: Discord.Interaction | Logos.Interaction,
): Promise<InteractionLocaleData> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return FALLBACK_LOCALE_DATA;
	}

	const member = client.entities.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${guildId}`));

	const [userDocument, guildDocument] = await Promise.all([
		User.getOrCreate(client, { userId: interaction.user.id.toString() }),
		Guild.getOrCreate(client, { guildId: guildId.toString() }),
	]);

	const targetOnlyChannelIds = getTargetOnlyChannelIds(guildDocument);
	const isInTargetOnlyChannel =
		interaction.channelId !== undefined && targetOnlyChannelIds.includes(interaction.channelId);

	const targetLanguage = guildDocument.targetLanguage;
	const learningLanguage = getLearningLanguage(guildDocument, targetLanguage, member);

	const guildLanguage = isInTargetOnlyChannel ? targetLanguage : guildDocument.localisationLanguage;
	const guildLocale = getLocaleByLocalisationLanguage(guildLanguage);
	const featureLanguage = guildDocument.featureLanguage;

	if (!isAutocomplete(interaction)) {
		// If the user has configured a custom locale, use the user's preferred locale.
		if (userDocument.preferredLanguage !== undefined) {
			const language = userDocument.preferredLanguage;
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

function getTargetOnlyChannelIds(guildDocument: Guild): bigint[] {
	const language = guildDocument.features.language;
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
	guildDocument: Guild,
	guildLearningLanguage: LearningLanguage,
	member: Logos.Member | undefined,
): LearningLanguage {
	if (member === undefined) {
		return guildLearningLanguage;
	}

	const language = guildDocument.features.language;
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
		show: client.localise("interactions.show", locale)(),
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
	createModalComposer,
	decodeId,
	encodeId,
	generateButtons,
	isAutocomplete,
	paginate,
	parseArguments,
	getLocaleData,
	parseTimeExpression,
	getShowButton,
	getCommandName,
};
export type { ControlButtonID, Modal };
