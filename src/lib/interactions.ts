import constants, { Periods } from "../constants.js";
import { defaultLanguage, defaultLocale, getLanguageByLocale } from "../types.js";
import { Client, addCollector, localise, pluralise } from "./client.js";
import * as Discord from "discordeno";
import { DiscordSnowflake as Snowflake } from "snowflake";

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
		filter: (_, interaction) => compileChecks(interaction, settings, customId).every((condition) => condition),
		limit: settings.limit,
		removeAfter: settings.doesNotExpire ? undefined : constants.interactionTokenExpiryInterval,
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
	interaction: Discord.Interaction,
	{
		elements,
		embed,
		view,
		show,
	}: {
		elements: T[];
		embed: Omit<Discord.Embed, "footer">;
		view: PaginationDisplayData<T>;
		show: boolean;
	},
): Promise<void> {
	const data: PaginationData<T> = { elements, view, pageIndex: 0 };

	const isFirst = () => data.pageIndex === 0;
	const isLast = () => data.pageIndex === data.elements.length - 1;

	const customId = createInteractionCollector([client, bot], {
		type: Discord.InteractionTypes.MessageComponent,
		doesNotExpire: true,
		onCollect: async (bot, selection) => {
			acknowledge([client, bot], selection);

			const customId = selection.data?.customId;
			if (customId === undefined) {
				return;
			}

			const [_, action] = decodeId<ControlButtonID>(customId);

			switch (action) {
				case "previous": {
					if (!isFirst) {
						data.pageIndex--;
					}
					break;
				}
				case "next": {
					if (!isLast) {
						data.pageIndex++;
					}
					break;
				}
			}

			editReply([client, bot], interaction, {
				embeds: [getPageEmbed(client, data, embed, isLast(), interaction.locale)],
				components: generateButtons(customId, isFirst(), isLast()),
			});
		},
	});

	reply(
		[client, bot],
		interaction,
		{
			embeds: [getPageEmbed(client, data, embed, data.pageIndex === data.elements.length - 1, interaction.locale)],
			components: generateButtons(customId, isFirst(), isLast()),
		},
		{ visible: show },
	);
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
	embed: Discord.Embed,
	isLast: boolean,
	locale: string | undefined,
): Discord.Embed {
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
		fields: [
			{
				name:
					data.elements.length === 1
						? data.view.title
						: `${data.view.title} ~ ${strings.page} ${data.pageIndex + 1}/${data.elements.length}`,
				value: data.view.generate(elements, data.pageIndex),
			},
			...(embed.fields ?? []),
		],
		footer: isLast ? undefined : { text: strings.continuedOnNextPage },
	};
}

function generateButtons(customId: string, isFirst: boolean, isLast: boolean): Discord.MessageComponents {
	const buttons: Discord.ButtonComponent[] = [];

	if (!isFirst) {
		buttons.push({
			type: Discord.MessageComponentTypes.Button,
			customId: encodeId<ControlButtonID>(customId, ["previous"]),
			style: Discord.ButtonStyles.Secondary,
			label: constants.symbols.interactions.menu.controls.back,
		});
	}

	if (!isLast) {
		buttons.push({
			type: Discord.MessageComponentTypes.Button,
			customId: encodeId<ControlButtonID>(customId, ["next"]),
			style: Discord.ButtonStyles.Secondary,
			label: constants.symbols.interactions.menu.controls.forward,
		});
	}

	return buttons.length === 0
		? []
		: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: buttons as [Discord.ButtonComponent],
				},
		  ];
}

type ComposerActionRow<ComposerContent extends Record<string, unknown>, SectionNames = keyof ComposerContent> = {
	type: Discord.MessageComponentTypes.ActionRow;
	components: [
		Discord.ActionRow["components"][0] & { type: Discord.MessageComponentTypes.InputText; customId: SectionNames },
	];
};

type Modal<ComposerContent extends Record<string, unknown>, SectionNames = keyof ComposerContent> = {
	title: string;
	fields: ComposerActionRow<ComposerContent, SectionNames>[];
};

async function createModalComposer<
	ComposerContent extends Record<string, unknown>,
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
				onCollect: async (_, submission) => {
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
	ComposerContent extends Record<string, unknown>,
	SectionNames extends keyof ComposerContent = keyof ComposerContent,
>(submission: Discord.Interaction): ComposerContent | undefined {
	const content: Partial<ComposerContent> = {};

	const fields = submission?.data?.components?.map((component) => component.components?.at(0));
	if (fields === undefined) {
		return;
	}

	for (const field of fields) {
		const key = field.customId as SectionNames;
		const value = field.value;

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
	locale: string | undefined,
): [correctedExpression: string, period: number] | undefined {
	const conciseMatch = conciseTimeExpression.exec(expression) ?? undefined;
	if (conciseMatch !== undefined) {
		const [_, hours, minutes, seconds] = conciseMatch;
		if (seconds === undefined) {
			throw `StateError: The expression '${conciseTimeExpression}' was matched to the concise timestamp regular expression, but the seconds part was \`undefined\`.`;
		}

		return parseConciseTimeExpression(client, [hours, minutes, seconds], locale);
	}

	return parseVerboseTimeExpressionPhrase(client, expression, locale);
}

function parseConciseTimeExpression(
	client: Client,
	parts: [hours: string | undefined, minutes: string | undefined, seconds: string],
	locale: string | undefined,
): ReturnType<typeof parseTimeExpression> {
	const [seconds, minutes, hours] = parts.map((part) => (part !== undefined ? Number(part) : undefined)).reverse() as [
		number,
		...number[],
	];

	const language = getLanguageByLocale(locale) ?? defaultLanguage;

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

	const expressionParsed = parseVerboseTimeExpressionPhrase(client, verboseExpression, locale);
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
	second: Periods.second,
	minute: Periods.minute,
	hour: Periods.hour,
	day: Periods.day,
	week: Periods.week,
	month: Periods.month,
	year: Periods.year,
};

const timeUnitsWithAliasesLocalised = new Map<string, Record<TimeUnit, string[]>>();

function parseVerboseTimeExpressionPhrase(
	client: Client,
	expression: string,
	locale: string | undefined,
): ReturnType<typeof parseTimeExpression> {
	if (!timeUnitsWithAliasesLocalised.has(locale ?? defaultLocale)) {
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

		timeUnitsWithAliasesLocalised.set(
			locale ?? defaultLocale,
			Object.fromEntries(timeUnitAliasTuples) as Record<TimeUnit, string[]>,
		);
	}

	const timeUnitsWithAliases = timeUnitsWithAliasesLocalised.get(locale ?? defaultLocale);
	if (timeUnitsWithAliases === undefined) {
		throw `Failed to get time unit aliases for either locale '${locale}' or '${defaultLocale}'.`;
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
			throw `Failed to get quantifier for time unit '${timeUnit}' and either locale '${locale}' or '${defaultLocale}'.`;
		}

		timeUnitQuantifierTuples.push([timeUnit, quantifier]);
	}
	timeUnitQuantifierTuples.sort(([previous], [next]) => timeUnitToPeriod[next] - timeUnitToPeriod[previous]);

	const language = getLanguageByLocale(locale) ?? defaultLanguage;

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

async function acknowledge([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	return Discord.sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: Discord.InteractionResponseTypes.DeferredUpdateMessage,
	}).catch((reason) => client.log.warn(`Failed to acknowledge interaction: ${reason}`));
}

async function postponeReply(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	{ visible = false } = {},
): Promise<void> {
	return Discord.sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: Discord.InteractionResponseTypes.DeferredChannelMessageWithSource,
		data: visible ? {} : { flags: Discord.ApplicationCommandFlags.Ephemeral },
	}).catch((reason) => client.log.warn(`Failed to postpone reply to interaction: ${reason}`));
}

async function reply(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	data: Omit<Discord.InteractionCallbackData, "flags">,
	{ visible = false } = {},
): Promise<void> {
	return Discord.sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
		data: { ...data, flags: visible ? undefined : Discord.ApplicationCommandFlags.Ephemeral },
	}).catch((reason) => client.log.warn(`Failed to reply to interaction: ${reason}`));
}

async function editReply(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	data: Omit<Discord.InteractionCallbackData, "flags">,
): Promise<void> {
	return Discord.editOriginalInteractionResponse(bot, interaction.token, data)
		.then(() => {})
		.catch((reason) => client.log.warn(`Failed to edit reply to interaction: ${reason}`));
}

async function deleteReply([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<void> {
	return Discord.deleteOriginalInteractionResponse(bot, interaction.token).catch((reason) =>
		client.log.warn(`Failed to edit reply to interaction: ${reason}`),
	);
}

async function respond(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	choices: Discord.ApplicationCommandOptionChoice[],
): Promise<void> {
	return Discord.sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: Discord.InteractionResponseTypes.ApplicationCommandAutocompleteResult,
		data: { choices },
	}).catch((reason) => client.log.warn(`Failed to respond to autocomplete interaction: ${reason}`));
}

async function displayModal(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	data: Omit<Discord.InteractionCallbackData, "flags">,
): Promise<void> {
	return Discord.sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: Discord.InteractionResponseTypes.Modal,
		data,
	}).catch((reason) => client.log.warn(`Failed to show modal: ${reason}`));
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
	isAutocomplete,
	paginate,
	parseArguments,
	parseTimeExpression,
	postponeReply,
	reply,
	respond,
};
export type { ControlButtonID, InteractionCollectorSettings, Modal };