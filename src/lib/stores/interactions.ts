import { Locale } from "logos:constants/languages";
import { TimeUnit } from "logos:constants/time";
import { Client } from "logos/client";
import { Logger } from "logos/logger";

class InteractionStore {
	readonly log: Logger;

	readonly #bot: Discord.Bot;
	readonly #interactions: Map<bigint, Logos.Interaction>;

	get success(): InteractionStore["reply"] {
		return this.replyColoured({ colour: constants.colours.success });
	}

	get notice(): InteractionStore["reply"] {
		return this.replyColoured({ colour: constants.colours.notice });
	}

	get warning(): InteractionStore["reply"] {
		return this.replyColoured({ colour: constants.colours.warning });
	}

	get error(): InteractionStore["reply"] {
		return this.replyColoured({ colour: constants.colours.error });
	}

	get failure(): InteractionStore["reply"] {
		return this.replyColoured({ colour: constants.colours.failure });
	}

	get death(): InteractionStore["reply"] {
		return this.replyColoured({ colour: constants.colours.death });
	}

	constructor(client: Client, { bot }: { bot: Discord.Bot }) {
		this.log = Logger.create({ identifier: "Interactions", isDebug: client.environment.isDebug });

		this.#bot = bot;
		this.#interactions = new Map();
	}

	static spoofInteraction<Interaction extends Logos.Interaction>(
		interaction: Interaction,
		{ using, parameters }: { using: Logos.Interaction; parameters?: Interaction["parameters"] },
	): Interaction {
		return {
			...interaction,
			parameters: { ...interaction.parameters, ...parameters },
			type: Discord.InteractionTypes.ApplicationCommand,
			token: using.token,
			id: using.id,
		};
	}

	registerInteraction(interaction: Logos.Interaction): void {
		this.#interactions.set(interaction.id, interaction);
	}

	unregisterInteraction(interactionId: bigint): Logos.Interaction | undefined {
		const interaction = this.#interactions.get(interactionId);
		if (interaction === undefined) {
			return undefined;
		}

		this.#interactions.delete(interactionId);

		return interaction;
	}

	async acknowledge(interaction: Logos.Interaction): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredUpdateMessage,
			})
			.catch((reason) => this.log.warn("Failed to acknowledge interaction:", reason));
	}

	async postponeReply(interaction: Logos.Interaction, { visible = false } = {}): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.DeferredChannelMessageWithSource,
				data: visible ? {} : { flags: Discord.MessageFlags.Ephemeral },
			})
			.catch((reason) => this.log.warn("Failed to postpone reply to interaction:", reason));
	}

	async reply(
		interaction: Logos.Interaction,
		data: Omit<Discord.InteractionCallbackData, "flags">,
		{ visible = false } = {},
	): Promise<void> {
		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
				data: { ...data, flags: visible ? undefined : Discord.MessageFlags.Ephemeral },
			})
			.catch((reason) => this.log.warn("Failed to reply to interaction:", reason));
	}

	async editReply(interaction: Logos.Interaction, data: Omit<Discord.InteractionCallbackData, "flags">): Promise<void> {
		await this.#bot.rest
			.editOriginalInteractionResponse(interaction.token, data)
			.catch((reason) => this.log.warn("Failed to edit reply to interaction:", reason));
	}

	async deleteReply(interaction: Logos.Interaction): Promise<void> {
		await this.#bot.rest
			.deleteOriginalInteractionResponse(interaction.token)
			.catch((reason) => this.log.warn("Failed to delete reply to interaction:", reason));
	}

	async respond(interaction: Logos.Interaction, choices: Discord.ApplicationCommandOptionChoice[]): Promise<void> {
		return this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: { choices },
			})
			.catch((reason) => this.log.warn("Failed to respond to autocomplete interaction:", reason));
	}

	async displayModal(
		interaction: Logos.Interaction,
		data: Omit<Discord.InteractionCallbackData, "flags">,
	): Promise<void> {
		return this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.Modal,
				data,
			})
			.catch((reason) => this.log.warn("Failed to show modal:", reason));
	}

	replyColoured({ colour }: { colour: number }): InteractionStore["reply"] {
		return async (interaction, data, flags) => {
			for (const embed of data.embeds ?? []) {
				embed.color = colour;
			}

			return await this.reply(interaction, data, flags);
		};
	}
}

// TODO(vxern): Move this to a more suitable place.
function parseTimeExpression(
	client: Client,
	expression: string,
	{ locale }: { locale: Locale },
): [correctedExpression: string, period: number] | undefined {
	const conciseMatch = constants.patterns.conciseTimeExpression.exec(expression) ?? undefined;
	if (conciseMatch !== undefined) {
		const [_, hours, minutes, seconds] = conciseMatch;
		if (seconds === undefined) {
			throw `StateError: The expression '${expression}' was matched to the concise timestamp regular expression, but the seconds part was \`undefined\`.`;
		}

		return parseConciseTimeExpression(client, [hours, minutes, seconds], { locale });
	}

	return parseVerboseTimeExpressionPhrase(client, expression, { locale });
}

function parseConciseTimeExpression(
	client: Client,
	parts: [hours: string | undefined, minutes: string | undefined, seconds: string],
	{ locale }: { locale: Locale },
): ReturnType<typeof parseTimeExpression> {
	const [seconds, minutes, hours] = parts.map((part) => (part !== undefined ? Number(part) : undefined)).reverse() as [
		number,
		...number[],
	];

	const verboseExpressionParts = [];

	if (seconds !== 0) {
		const strings = {
			second: client.pluralise("units.second.word", locale, { quantity: seconds }),
		};

		verboseExpressionParts.push(strings.second);
	}

	if (minutes !== undefined && minutes !== 0) {
		const strings = {
			minute: client.pluralise("units.minute.word", locale, { quantity: minutes }),
		};

		verboseExpressionParts.push(strings.minute);
	}

	if (hours !== undefined && hours !== 0) {
		const strings = {
			hour: client.pluralise("units.hour.word", locale, { quantity: hours }),
		};

		verboseExpressionParts.push(strings.hour);
	}
	const verboseExpression = verboseExpressionParts.join(" ");

	const expressionParsed = parseVerboseTimeExpressionPhrase(client, verboseExpression, { locale });
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

const timeUnitsWithAliasesLocalised = new Map<string, Record<TimeUnit, string[]>>();

function parseVerboseTimeExpressionPhrase(
	client: Client,
	expression: string,
	{ locale }: { locale: Locale },
): ReturnType<typeof parseTimeExpression> {
	if (!timeUnitsWithAliasesLocalised.has(locale)) {
		const timeUnits = Object.keys(constants.time) as TimeUnit[];
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
	timeUnitQuantifierTuples.sort(([previous], [next]) => constants.time[next] - constants.time[previous]);

	const timeExpressions = [];
	let total = 0;
	for (const [timeUnit, quantifier] of timeUnitQuantifierTuples) {
		const strings = {
			unit: client.pluralise(`units.${timeUnit}.word`, locale, { quantity: quantifier }),
		};

		timeExpressions.push(strings.unit);

		total += quantifier * constants.time[timeUnit];
	}
	const correctedExpression = timeExpressions.join(", ");

	return [correctedExpression, total];
}

export { parseTimeExpression, InteractionStore };
