import { Bot, EventHandlers, Interaction, InteractionDataOption, InteractionTypes } from 'discordeno';
import * as Snowflake from 'snowflake';
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
	clientWithBot: [Client, Bot],
	settings: InteractionCollectorSettings,
): string {
	const customId = settings.customId ?? Snowflake.generate();

	addCollector(clientWithBot, 'interactionCreate', {
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

export { createInteractionCollector, parseArguments };
