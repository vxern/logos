import {
	ActionRow,
	ApplicationCommandFlags,
	ApplicationCommandOptionChoice,
	Bot,
	ButtonComponent,
	ButtonStyles,
	deleteOriginalInteractionResponse,
	editOriginalInteractionResponse,
	Embed,
	EventHandlers,
	Interaction,
	InteractionCallbackData,
	InteractionDataOption,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponents,
	MessageComponentTypes,
	sendInteractionResponse,
} from 'discordeno';
import * as Snowflake from 'snowflake';
import { addCollector, Client, localise } from 'logos/src/client.ts';
import constants, { Periods } from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

type AutocompleteInteraction = Interaction & { type: InteractionTypes.ApplicationCommandAutocomplete };

function isAutocomplete(interaction: Interaction): interaction is AutocompleteInteraction {
	return interaction.type === InteractionTypes.ApplicationCommandAutocomplete;
}

/** Settings for interaction collection. */
interface InteractionCollectorSettings {
	/** The type of interaction to listen for. */
	type: InteractionTypes;

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

	onCollect?: (...args: Parameters<EventHandlers['interactionCreate']>) => void;
	onEnd?: () => void;
}

/**
 * Taking a {@link Client} and {@link InteractionCollectorSettings}, creates an
 * interaction collector.
 */
function createInteractionCollector(
	[client, bot]: [Client, Bot],
	settings: InteractionCollectorSettings,
): string {
	const customId = settings.customId ?? Snowflake.generate();

	addCollector([client, bot], 'interactionCreate', {
		filter: (_, interaction) => compileChecks(interaction, settings, customId).every((condition) => condition),
		limit: settings.limit,
		removeAfter: settings.doesNotExpire ? undefined : constants.interactionTokenExpiryInterval,
		onCollect: settings.onCollect ?? (() => {}),
		onEnd: settings.onEnd ?? (() => {}),
	});

	return customId;
}

function compileChecks(interaction: Interaction, settings: InteractionCollectorSettings, customId: string): boolean[] {
	return [
		interaction.type === settings.type,
		interaction.data !== undefined && interaction.data.customId !== undefined &&
		decodeId(interaction.data.customId)[0] === decodeId(customId)[0],
		settings.userId === undefined ? true : interaction.user.id === settings.userId,
	];
}

type CustomTypeIndicators = Record<string, 'number' | 'boolean'>;
type CustomTypeIndicatorsTyped<C extends CustomTypeIndicators> = {
	[key in keyof C]: (C[key] extends 'number' ? number : boolean) | undefined;
};

function parseArguments<
	T extends Record<string, string | undefined>,
	R extends CustomTypeIndicatorsTyped<C> & T,
	C extends Record<string, 'number' | 'boolean'>,
>(
	options: InteractionDataOption[] | undefined,
	customTypes: C,
): [R, InteractionDataOption | undefined] {
	let args: Record<string, unknown> = {};

	let focused: InteractionDataOption | undefined = undefined;
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
			case 'boolean': {
				args[option.name] = option.value as boolean;
				continue;
			}
			case 'number': {
				args[option.name] = parseInt(option.value as string);
				continue;
			}
		}

		args[option.name] = option.value as string;
	}

	return [args as R, focused];
}

type ControlButtonID = [type: 'previous' | 'next'];

/**
 * Paginates an array of elements, allowing the user to browse between pages
 * in an embed view.
 */
function paginate<T>(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	{ elements, embed, view, show }: {
		elements: T[];
		embed: Omit<Embed, 'footer'>;
		view: PaginationDisplayData<T>;
		show: boolean;
	},
): void {
	const data: PaginationData<T> = { elements, view, pageIndex: 0 };

	const isFirst = () => data.pageIndex === 0;
	const isLast = () => data.pageIndex === data.elements.length - 1;

	const customId = createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		doesNotExpire: true,
		onCollect: (bot, selection) => {
			acknowledge([client, bot], selection);

			if (selection.data === undefined) return;

			const [_, action] = decodeId<ControlButtonID>(selection.data.customId!);

			switch (action) {
				case 'previous':
					if (!isFirst) data.pageIndex--;
					break;
				case 'next':
					if (!isLast) data.pageIndex++;
					break;
			}

			editReply([client, bot], interaction, {
				embeds: [getPageEmbed(client, data, embed, isLast(), interaction.locale)],
				components: generateButtons(customId, isFirst(), isLast()),
			});
		},
	});

	return void reply([client, bot], interaction, {
		embeds: [getPageEmbed(client, data, embed, data.pageIndex === data.elements.length - 1, interaction.locale)],
		components: generateButtons(customId, isFirst(), isLast()),
	}, { visible: show });
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
	embed: Embed,
	isLast: boolean,
	locale: string | undefined,
): Embed {
	const strings = {
		page: localise(client, 'interactions.page', locale)(),
		continuedOnNextPage: localise(client, 'interactions.continuedOnNextPage', locale)(),
	};

	return {
		...embed,
		fields: [
			{
				name: data.elements.length === 1
					? data.view.title
					: `${data.view.title} ~ ${strings.page} ${data.pageIndex + 1}/${data.elements.length}`,
				value: data.view.generate(data.elements.at(data.pageIndex)!, data.pageIndex),
			},
			...(embed.fields ?? []),
		],
		footer: isLast ? undefined : { text: strings.continuedOnNextPage },
	};
}

function generateButtons(customId: string, isFirst: boolean, isLast: boolean): MessageComponents {
	const buttons: ButtonComponent[] = [];

	if (!isFirst) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: encodeId<ControlButtonID>(customId, ['previous']),
			style: ButtonStyles.Secondary,
			label: constants.symbols.interactions.menu.controls.back,
		});
	}

	if (!isLast) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: encodeId<ControlButtonID>(customId, ['next']),
			style: ButtonStyles.Secondary,
			label: constants.symbols.interactions.menu.controls.forward,
		});
	}

	return buttons.length === 0 ? [] : [{
		type: MessageComponentTypes.ActionRow,
		components: buttons as [ButtonComponent],
	}];
}

type ComposerContent<T extends string> = Record<T, string | undefined>;
type ComposerActionRow<T extends string> = {
	type: MessageComponentTypes.ActionRow;
	components: [ActionRow['components'][0] & { type: MessageComponentTypes.InputText; customId: T }];
};

type Modal<T extends string> = { title: string; fields: ComposerActionRow<T>[] };

async function createModalComposer<T extends string>(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	{ onSubmit, onInvalid, modal }: {
		onSubmit: (submission: Interaction, data: ComposerContent<T>) => Promise<true | string>;
		onInvalid: (submission: Interaction, error?: string) => Promise<Interaction | undefined>;
		modal: Modal<T>;
	},
): Promise<void> {
	const fields = structuredClone(modal.fields);

	let anchor = interaction;
	let content: ComposerContent<T> | undefined = undefined;

	while (true) {
		const [submission, result] = await new Promise<[Interaction, boolean | string]>((resolve) => {
			const modalId = createInteractionCollector([client, bot], {
				type: InteractionTypes.ModalSubmit,
				userId: interaction.user.id,
				limit: 1,
				onCollect: (_, submission) => {
					content = parseComposerContent(submission);
					if (content === undefined) return resolve([submission, false]);

					return onSubmit(submission, content).then((result) => resolve([submission, result]));
				},
			});

			if (content !== undefined) {
				const answers = Object.values(content) as (string | undefined)[];
				for (
					const [value, index] of answers.map<[string | undefined, number]>((v, i) => [v, i])
				) {
					fields[index]!.components[0].value = value;
				}
			}

			showModal([client, bot], anchor, {
				title: modal.title,
				customId: modalId,
				components: fields,
			});
		});

		if (typeof result === 'boolean' && result) return;

		const newAnchor = await (typeof result === 'string' ? onInvalid(submission, result) : onInvalid(submission));
		if (newAnchor === undefined) return;

		anchor = newAnchor;
	}
}

function parseComposerContent<T extends string>(submission: Interaction): ComposerContent<T> | undefined {
	const content: Partial<ComposerContent<T>> = {};

	const fields = submission?.data?.components?.map((component) => component.components?.at(0));
	if (fields === undefined) return;

	for (const field of fields) {
		const key = field!.customId as T;
		const value = field!.value!;

		if (value.length === 0) {
			content[key] = undefined;
		} else {
			content[key] = value;
		}
	}

	return content as ComposerContent<T>;
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
	if (conciseTimeExpression.test(expression)) {
		return parseConciseTimeExpression(client, expression, locale);
	}

	return parseVerboseTimeExpressionPhrase(client, expression, locale);
}

function parseConciseTimeExpression(
	client: Client,
	expression: string,
	locale: string | undefined,
): ReturnType<typeof parseTimeExpression> {
	const [secondsPart, minutesPart, hoursPart] = conciseTimeExpression.exec(expression)!.slice(1).toReversed();

	const [seconds, minutes, hours] = [secondsPart, minutesPart, hoursPart].map((part) =>
		part !== undefined ? Number(part) : undefined
	) as [number, ...number[]];

	const verboseExpressionParts = [];
	if (seconds !== 0) {
		const strings = {
			second: localise(client, 'units.second', defaultLocale)({ 'number': seconds }),
		};

		verboseExpressionParts.push(strings.second);
	}
	if (minutes !== undefined && minutes !== 0) {
		const strings = {
			minute: localise(client, 'units.minute', defaultLocale)({ 'number': minutes }),
		};

		verboseExpressionParts.push(strings.minute);
	}
	if (hours !== undefined && hours !== 0) {
		const strings = {
			hour: localise(client, 'units.hour', defaultLocale)({ 'number': hours }),
		};

		verboseExpressionParts.push(strings.hour);
	}
	const verboseExpression = verboseExpressionParts.join(' ');

	const expressionParsed = parseVerboseTimeExpressionPhrase(client, verboseExpression, locale);
	if (expressionParsed === undefined) return undefined;

	const conciseExpression = [hoursPart ?? '0', minutesPart ?? '0', secondsPart ?? '0'].map((part) =>
		part.length === 1 ? `0${part}` : part
	).join(':');

	const [verboseExpressionCorrected, period] = expressionParsed;

	return [`${conciseExpression} (${verboseExpressionCorrected})`, period];
}

type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
const timeUnitToPeriod: Required<Record<TimeUnit, number>> = {
	'second': Periods.second,
	'minute': Periods.minute,
	'hour': Periods.hour,
	'day': Periods.day,
	'week': Periods.week,
	'month': Periods.month,
	'year': Periods.year,
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
					`units.${timeUnit}.word.one`,
					`units.${timeUnit}.word.two`,
					`units.${timeUnit}.word.many`,
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

	const timeUnitsWithAliases = timeUnitsWithAliasesLocalised.get(locale ?? defaultLocale)!;

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
	if (timeUnitAliases.length === 0 || quantifiers.length === 0) return undefined;

	// The number of values does not match the number of keys.
	if (quantifiers.length !== timeUnitAliases.length) return undefined;

	// One of the values is equal to 0.
	if (quantifiers.includes(0)) return undefined;

	const timeUnits: TimeUnit[] = [];
	for (const timeUnitAlias of timeUnitAliases) {
		const timeUnit = Object.entries(timeUnitsWithAliases).find(([_, aliases]) => aliases.includes(timeUnitAlias))?.[0];

		// TODO(vxern): Convey to the user that a time unit is invalid.
		if (timeUnit === undefined) return undefined;

		timeUnits.push(timeUnit as TimeUnit);
	}

	// If one of the keys is duplicate.
	if ((new Set(timeUnits)).size !== timeUnits.length) {
		return undefined;
	}

	const timeUnitQuantifierTuples = timeUnits
		.map<[TimeUnit, number]>((timeUnit, index) => [timeUnit, quantifiers[index]!]);
	timeUnitQuantifierTuples.sort(([previous], [next]) => timeUnitToPeriod[next] - timeUnitToPeriod[previous]);

	const timeExpressions = [];
	let total = 0;
	for (const [timeUnit, quantifier] of timeUnitQuantifierTuples) {
		const strings = {
			unit: localise(client, `units.${timeUnit}`, locale)({ 'number': quantifier }),
		};

		timeExpressions.push(strings.unit);

		total += quantifier * timeUnitToPeriod[timeUnit];
	}
	const correctedExpression = timeExpressions.join(', ');

	return [correctedExpression, total];
}

type ComponentIDMetadata = [arg: string, ...args: string[]];

function encodeId<T extends ComponentIDMetadata>(customId: string, args: T): string {
	return [customId, ...args].join(constants.symbols.meta.idSeparator);
}

function decodeId<T extends ComponentIDMetadata, R = [string, ...T]>(customId: string): R {
	return customId.split(constants.symbols.meta.idSeparator) as R;
}

function acknowledge([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	return sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredUpdateMessage,
	}).catch((reason) => client.log.warn(`Failed to acknowledge interaction: ${reason}`));
}

function postponeReply(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	{ visible = false } = {},
): Promise<void> {
	return sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredChannelMessageWithSource,
		data: !visible ? { flags: ApplicationCommandFlags.Ephemeral } : {},
	}).catch((reason) => client.log.warn(`Failed to postpone reply to interaction: ${reason}`));
}

function reply(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: Omit<InteractionCallbackData, 'flags'>,
	{ visible = false } = {},
): Promise<void> {
	return sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: !visible ? ApplicationCommandFlags.Ephemeral : undefined,
			...data,
		},
	}).catch((reason) => client.log.warn(`Failed to reply to interaction: ${reason}`));
}

function editReply(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: Omit<InteractionCallbackData, 'flags'>,
): Promise<void> {
	return editOriginalInteractionResponse(bot, interaction.token, data)
		.then(() => {})
		.catch((reason) => client.log.warn(`Failed to edit reply to interaction: ${reason}`));
}

function deleteReply([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	return deleteOriginalInteractionResponse(bot, interaction.token)
		.catch((reason) => client.log.warn(`Failed to edit reply to interaction: ${reason}`));
}

function respond(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	choices: ApplicationCommandOptionChoice[],
): Promise<void> {
	return sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
		data: { choices },
	}).catch((reason) => client.log.warn(`Failed to respond to autocomplete interaction: ${reason}`));
}

function showModal(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: Omit<InteractionCallbackData, 'flags'>,
): Promise<void> {
	return sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.Modal,
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
