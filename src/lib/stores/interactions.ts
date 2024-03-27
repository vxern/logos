import { Locale } from "logos:constants/languages";
import { TimeUnit } from "logos:constants/time";
import { Client } from "logos/client";
import { Logger } from "logos/logger";

type InteractionCallbackData = Omit<Discord.InteractionCallbackData, "flags">;
type EmbedOrCallbackData = Discord.CamelizedDiscordEmbed | InteractionCallbackData;
class InteractionStore {
	readonly log: Logger;

	readonly #bot: Discord.Bot;
	readonly #interactions: Map<bigint, Logos.Interaction>;

	/** ⬜ The action should have succeeded if not for the bot's limitations. */
	get unsupported(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.unsupported });
	}

	/** 🟦 Informational message. */
	get notice(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.notice });
	}

	/** @see {@link notice()} */
	get noticed(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.notice });
	}

	/**
	 * 🟩 The action intended to be performed with the interaction succeeded.
	 *
	 * @remarks
	 * 🟦 Shows up as a notice if the reply is visible to.
	 */
	get success(): InteractionStore["reply"] {
		return async (interaction, embedOrData, flags) => {
			if (flags?.visible) {
				return this.notice(interaction, embedOrData, flags);
			}

			return this.#buildColouredReplier({ colour: constants.colours.success })(interaction, embedOrData, flags);
		};
	}

	// TODO(vxern): This is not aware of the visibility of the original postponed reply, and thus cannot decide
	//  whether to show a success or a notice.
	/** @see {@link success()} */
	get succeeded(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.success });
	}

	/** 🟧 The user tried to do something that isn't technically invalid, but which the bot will not allow for. */
	get pushback(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.pushback });
	}

	/** @see {@link pushback()} */
	get pushedBack(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.pushback });
	}

	/** 🟨 The user unintentionally did something wrong. */
	get warning(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.warning });
	}

	/** @see {@link warning()} */
	get warned(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.warning });
	}

	/** 🟥 The user (assumably) intentionally tried to do something wrong. */
	get error(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.error });
	}

	/** @see {@link error()} */
	get errored(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.error });
	}

	/** 🔺 The bot failed to do something that should have otherwise happened just fine. */
	get failure(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.failure });
	}

	/** @see {@link failure()} */
	get failed(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.failure });
	}

	/** ⬛ The bot had an outage or encountered a serious issue. */
	get death(): InteractionStore["reply"] {
		return this.#buildColouredReplier({ colour: constants.colours.death });
	}

	/** @see {@link death()} */
	get died(): InteractionStore["editReply"] {
		return this.#buildColouredReplyEditor({ colour: constants.colours.death });
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
				data: !visible ? { flags: Discord.MessageFlags.Ephemeral } : {},
			})
			.catch((reason) => this.log.warn("Failed to postpone reply to interaction:", reason));
	}

	async reply(
		interaction: Logos.Interaction,
		embedOrData: EmbedOrCallbackData,
		{ visible = false } = {},
	): Promise<void> {
		const data = getInteractionCallbackData(embedOrData);

		if (!visible) {
			data.flags = Discord.MessageFlags.Ephemeral;
		}

		await this.#bot.rest
			.sendInteractionResponse(interaction.id, interaction.token, {
				type: Discord.InteractionResponseTypes.ChannelMessageWithSource,
				data,
			})
			.catch((reason) => this.log.warn("Failed to reply to interaction:", reason));
	}

	async editReply(interaction: Logos.Interaction, embedOrData: EmbedOrCallbackData): Promise<void> {
		await this.#bot.rest
			.editOriginalInteractionResponse(interaction.token, getInteractionCallbackData(embedOrData))
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

	#buildColouredReplier({ colour }: { colour: number }): InteractionStore["reply"] {
		return async (interaction, embedOrData, flags) => {
			setCallbackColour(embedOrData, { colour });

			await this.reply(interaction, embedOrData, flags);
		};
	}

	#buildColouredReplyEditor({ colour }: { colour: number }): InteractionStore["editReply"] {
		return async (interaction, embedOrData) => {
			setCallbackColour(embedOrData, { colour });

			await this.editReply(interaction, embedOrData);
		};
	}
}

function isEmbed(embedOrData: EmbedOrCallbackData): embedOrData is Discord.CamelizedDiscordEmbed {
	return "title" in embedOrData || "description" in embedOrData || "fields" in embedOrData;
}

function getInteractionCallbackData(embedOrData: EmbedOrCallbackData): Discord.InteractionCallbackData {
	if (isEmbed(embedOrData)) {
		return { embeds: [embedOrData] };
	}

	return embedOrData;
}

function setCallbackColour(embedOrData: EmbedOrCallbackData, { colour }: { colour: number }): EmbedOrCallbackData {
	if (isEmbed(embedOrData)) {
		embedOrData.color = colour;
	} else if (embedOrData.embeds !== undefined) {
		for (const embed of embedOrData.embeds) {
			embed.color = colour;
		}
	}

	return embedOrData;
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
