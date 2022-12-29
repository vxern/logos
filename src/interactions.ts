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
import configuration from 'logos/configuration.ts';

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
		removeAfter: settings.doesNotExpire ? undefined : configuration.collectors.expiresIn,
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

export { createInteractionCollector, createModalComposer, paginate, parseArguments };
export type { InteractionCollectorSettings, Modal };
