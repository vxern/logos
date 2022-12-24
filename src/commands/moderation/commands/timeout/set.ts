import {
	ApplicationCommandFlags,
	Bot,
	editMember,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, localise, Misc } from 'logos/assets/localisations/mod.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { guildAsAuthor } from 'logos/src/utils.ts';
import constants, { Periods } from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

async function handleSetTimeout(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, duration, reason }, focused] = parseArguments(
		interaction.data?.options,
		{},
	);

	if (
		interaction.type !== InteractionTypes.ApplicationCommandAutocomplete && user === undefined && duration === undefined
	) {
		return;
	}

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete && focused?.name === 'duration') {
		const timestamp = getTimestampFromExpression(duration!, interaction.locale);

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: timestamp === undefined ? [] : [{ name: timestamp[0], value: timestamp[1].toString() }],
				},
			},
		);
	}

	const member = resolveInteractionToMember([client, bot], interaction, user!);
	if (member === undefined) return;

	if (interaction.type !== InteractionTypes.ApplicationCommandAutocomplete && focused?.name !== 'reason') return;

	if (member.id === interaction.member?.id) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.cannotTimeoutSelf, interaction.locale),
		);
	}

	const durationParsed = Number(duration);

	if (Number.isNaN(duration)) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.invalidDuration, interaction.locale),
		);
	}

	if (durationParsed < Periods.minute) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.durationMustBeLongerThanMinute, interaction.locale),
		);
	}

	if (durationParsed > Periods.week) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.durationMustBeShorterThanWeek, interaction.locale),
		);
	}

	const until = Date.now() + durationParsed;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [_member, dmChannel] = await Promise.all([
		editMember(bot, interaction.guildId!, member.id, { communicationDisabledUntil: until }),
		getDmChannel(bot, member.id).catch(() => undefined),
	]);

	log([client, bot], guild, 'memberTimeoutAdd', member, until, reason!, interaction.user);

	sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Commands.timeout.strings.timedOut, interaction.locale)(
					mention(member.id, MentionTypes.User),
					timestamp(until),
				),
				color: constants.colors.blue,
			}],
		},
	});

	if (dmChannel === undefined) {
		const textChannel = client.cache.channels.get(interaction.channelId!);
		if (textChannel === undefined) return;

		const user = member.user;
		if (user === undefined) return;

		return void sendMessage(bot, textChannel.id, {
			embeds: [{
				description: localise(Commands.timeout.strings.timedOutWithReason, interaction.locale)(
					mention(member.id, MentionTypes.User),
					timestamp(until),
					reason!,
				),
				color: constants.colors.dullYellow,
			}],
		});
	}

	return void sendMessage(bot, dmChannel.id, {
		embeds: [
			{
				author: guildAsAuthor(bot, guild),
				description: localise(Commands.timeout.strings.timedOutDirect, defaultLocale)(timestamp(until), reason!),
				color: constants.colors.dullYellow,
			},
		],
	});
}

const digitsExpression = new RegExp(/\d+/g);
const stringsExpression = new RegExp(/\D+/g);

function extractNumbers(expression: string): number[] {
	return (expression.match(digitsExpression) ?? []).map((digits) => Number(digits));
}

function extractStrings(expression: string): string[] {
	return expression.match(stringsExpression) ?? [];
}

function getTimestampFromExpression(
	expression: string,
	locale: string | undefined,
): [string, number] | undefined {
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

	// If one of the keys is invalid.
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
				const [descriptors, milliseconds] = timeDescriptorsWithLocalisations.find(
					([descriptors, _value]) => localise(descriptors.descriptors, locale).includes(key),
				)!;

				return [localise(descriptors.display, locale), [
					quantifiers.at(index)!,
					quantifiers.at(index)! * milliseconds,
				], index];
			},
		)
		.toSorted((previous, next) => next[2] - previous[2]);

	const timeExpressions = [];
	let total = 0;
	for (const [display, [quantifier, milliseconds]] of keysWithValues) {
		timeExpressions.push(display(quantifier));
		total += milliseconds;
	}

	const timeExpression = timeExpressions.join(', ');

	return [timeExpression, total];
}

function displayError(bot: Bot, interaction: Interaction, error: string): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: error,
					color: constants.colors.dullYellow,
				}],
			},
		},
	);
}

export { handleSetTimeout };
