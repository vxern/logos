import {
	ActionRow,
	ApplicationCommandFlags,
	Bot,
	ButtonComponent,
	ButtonStyles,
	editOriginalInteractionResponse,
	Embed,
	EventHandlers,
	Interaction,
	InteractionDataOption,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponents,
	MessageComponentTypes,
	sendInteractionResponse,
} from 'discordeno';
import { lodash } from 'lodash';
import * as Snowflake from 'snowflake';
import { localise, Misc } from 'logos/assets/localisations/mod.ts';
import { addCollector, Client } from 'logos/src/client.ts';
import constants from 'logos/constants.ts';

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
		filter: (_bot, interaction) => compileChecks(interaction, settings, customId).every((condition) => condition),
		limit: settings.limit,
		removeAfter: settings.doesNotExpire ? undefined : constants.interactionTokenExpiryInterval,
		onCollect: settings.onCollect ?? (() => {}),
		onEnd: settings.onEnd ?? (() => {}),
	});

	return customId;
}

function compileChecks(
	interaction: Interaction,
	settings: InteractionCollectorSettings,
	customId: string,
): boolean[] {
	return [
		interaction.type === settings.type,
		interaction.data !== undefined && interaction.data.customId !== undefined &&
		interaction.data.customId.split('|').at(0)! === customId.split('|').at(0)!,
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
			const [parsedArgs, parsedFocused] = parseArguments(
				option.options,
				customTypes,
			);
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
				args[option.name] = <boolean> option.value;
				continue;
			}
			case 'number': {
				args[option.name] = parseInt(<string> option.value);
				continue;
			}
		}

		args[option.name] = <string> option.value;
	}

	return [args as R, focused];
}

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
			if (selection.data === undefined) return;

			const action = selection.data.customId!.split('|')[1]!;

			switch (action) {
				case 'PREVIOUS':
					if (!isFirst) data.pageIndex--;
					break;
				case 'NEXT':
					if (!isLast) data.pageIndex++;
					break;
			}

			sendInteractionResponse(bot, selection.id, selection.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});

			editOriginalInteractionResponse(bot, interaction.token, {
				embeds: [getPageEmbed(data, embed, isLast(), interaction.locale)],
				components: generateButtons(customId, isFirst(), isLast()),
			});
		},
	});

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [getPageEmbed(data, embed, data.pageIndex === data.elements.length - 1, interaction.locale)],
				components: generateButtons(customId, isFirst(), isLast()),
			},
		},
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

function getPageEmbed<T>(data: PaginationData<T>, embed: Embed, isLast: boolean, locale: string | undefined): Embed {
	return {
		...embed,
		fields: [
			{
				name: data.elements.length === 1
					? data.view.title
					: `${data.view.title} ~ Page ${data.pageIndex + 1}/${data.elements.length}`,
				value: data.view.generate(data.elements.at(data.pageIndex)!, data.pageIndex),
			},
			...(embed.fields ?? []),
		],
		footer: isLast ? undefined : { text: localise(Misc.continuedOnNextPage, locale) },
	};
}

function generateButtons(customId: string, isFirst: boolean, isLast: boolean): MessageComponents {
	const buttons: ButtonComponent[] = [];

	if (!isFirst) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: `${customId}|PREVIOUS`,
			style: ButtonStyles.Secondary,
			label: '«',
		});
	}

	if (!isLast) {
		buttons.push({
			type: MessageComponentTypes.Button,
			customId: `${customId}|NEXT`,
			style: ButtonStyles.Secondary,
			label: '»',
		});
	}

	// @ts-ignore: It is guaranteed that there will be fewer or as many as 5 buttons.
	return buttons.length === 0 ? [] : [{
		type: MessageComponentTypes.ActionRow,
		components: buttons,
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
	const fields = lodash.cloneDeep(modal.fields);

	let anchor = interaction;
	let content: ComposerContent<T> | undefined = undefined;

	while (true) {
		const [submission, result] = await new Promise<[Interaction, boolean | string]>((resolve) => {
			const modalId = createInteractionCollector([client, bot], {
				type: InteractionTypes.ModalSubmit,
				userId: interaction.user.id,
				limit: 1,
				onCollect: (_bot, submission) => {
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

			sendInteractionResponse(bot, anchor.id, anchor.token, {
				type: InteractionResponseTypes.Modal,
				data: {
					title: modal.title,
					customId: modalId,
					components: fields,
				},
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
const shortTimeExpression = new RegExp(
	/^(?:(?:(0?[0-9]|1[0-9]|2[0-4]):)?(?:(0?[0-9]|[1-5][0-9]|60):))?(0?[0-9]|[1-5][0-9]|60)$/,
);

function parseTimeExpression(
	expression: string,
	convertToPhrase: boolean,
	locale: string | undefined,
): [correctedExpression: string, period: number] | undefined {
	if (shortTimeExpression.test(expression)) return parseShortTimeExpression(expression, convertToPhrase, locale);
	return parseTimeExpressionPhrase(expression, locale);
}

function parseShortTimeExpression(
	expression: string,
	convertToPhrase: boolean,
	locale: string | undefined,
): ReturnType<typeof parseTimeExpression> {
	const [secondsPart, minutesPart, hoursPart] = shortTimeExpression.exec(expression)!.slice(1).toReversed();

	const [seconds, minutes, hours] = [secondsPart, minutesPart, hoursPart].map((part) =>
		part !== undefined ? Number(part) : undefined
	) as [number, ...number[]];

	if (!convertToPhrase) {
		let totalSeconds = seconds;
		if (minutes !== undefined) {
			totalSeconds += minutes * 60;
		}
		if (hours !== undefined) {
			totalSeconds += hours * 60 * 60;
		}
		return [expression, totalSeconds * 1000];
	}

	let correctedExpression = '';
	if (seconds !== undefined && seconds !== 0) {
		correctedExpression += `${seconds} ${localise(Misc.time.periods.second.descriptors, locale).at(-1)} `;
	}
	if (minutes !== undefined && minutes !== 0) {
		correctedExpression += `${minutes} ${localise(Misc.time.periods.minute.descriptors, locale).at(-1)} `;
	}
	if (hours !== undefined) {
		correctedExpression += `${hours} ${localise(Misc.time.periods.hour.descriptors, locale).at(-1)}`;
	}

	return parseTimeExpressionPhrase(correctedExpression, locale);
}

function parseTimeExpressionPhrase(
	expression: string,
	locale: string | undefined,
): ReturnType<typeof parseTimeExpression> {
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
	const periodNames = extractStrings(expression);

	// No parameters have been provided for both keys and values.
	if (periodNames.length === 0 || quantifiers.length === 0) return undefined;

	// The number of values does not match the number of keys.
	if (quantifiers.length !== periodNames.length) return undefined;

	// One of the values is equal to 0.
	if (quantifiers.includes(0)) return undefined;

	const timeDescriptorsWithLocalisations = constants.timeDescriptors.map<
		[typeof Misc.time.periods[keyof typeof Misc.time.periods], number]
	>(
		([descriptor, period]) => {
			const descriptorLocalised = Misc.time.periods[descriptor as keyof typeof Misc.time.periods];
			return [descriptorLocalised, period];
		},
	);

	const validTimeDescriptors = timeDescriptorsWithLocalisations.reduce<string[]>(
		(validTimeDescriptors, [descriptors, _period]) => {
			validTimeDescriptors.push(...localise(descriptors.descriptors, locale));
			return validTimeDescriptors;
		},
		[],
	);

	// If any one of the keys is invalid.
	if (periodNames.some((key) => !validTimeDescriptors.includes(key))) {
		return undefined;
	}

	const quantifierFrequencies = periodNames.reduce(
		(frequencies, quantifier) => {
			const index = timeDescriptorsWithLocalisations.findIndex(([descriptors, _period]) =>
				localise(descriptors.descriptors, locale).includes(quantifier)
			);

			frequencies[index]++;

			return frequencies;
		},
		Array.from({ length: constants.timeDescriptors.length }, () => 0),
	);

	// If one of the keys is duplicate.
	if (quantifierFrequencies.some((count) => count > 1)) {
		return undefined;
	}

	const keysWithValues = periodNames
		.map<[(number: number) => string, [number, number], number]>(
			(key, index) => {
				const timeDescriptorIndex = timeDescriptorsWithLocalisations.findIndex(
					([descriptors, _value]) => localise(descriptors.descriptors, locale).includes(key),
				)!;

				const [descriptors, milliseconds] = timeDescriptorsWithLocalisations.at(timeDescriptorIndex!)!;

				return [localise(descriptors.display, locale), [
					quantifiers.at(index)!,
					quantifiers.at(index)! * milliseconds,
				], timeDescriptorIndex];
			},
		)
		.toSorted((previous, next) => next[2] - previous[2]);

	const timeExpressions = [];
	let total = 0;
	for (const [display, [quantifier, milliseconds]] of keysWithValues) {
		timeExpressions.push(display(quantifier));
		total += milliseconds;
	}

	const correctedExpression = timeExpressions.join(', ');

	return [correctedExpression, total];
}

export { createInteractionCollector, createModalComposer, paginate, parseArguments, parseTimeExpression };
export type { InteractionCollectorSettings, Modal };
