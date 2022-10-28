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
} from '../../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../../client.ts';
import configuration, {
	Periods,
	timeDescriptors,
} from '../../../../configuration.ts';
import { displayTime, mention, MentionTypes } from '../../../../formatting.ts';
import { log } from '../../../../controllers/logging.ts';
import { localise } from '../../../../../assets/localisations/types.ts';
import { Commands } from '../../../../../assets/localisations/commands.ts';
import { defaultLanguage } from '../../../../types.ts';
import { guildAsAuthor } from '../../../../utils.ts';

async function setTimeout(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const data = interaction.data;
	if (!data) return;

	const options = data.options?.at(0)?.options;
	if (!options) return;

	const userIdentifierOption = options.find((option) => option.name === 'user');
	const durationIdentifier = <string | undefined> options.find((option) =>
		option.name === 'duration'
	)?.value;
	const reason = <string | undefined> options.find((option) =>
		option.name === 'reason'
	)?.value;
	if (reason === undefined) return;

	if (
		interaction.type !== InteractionTypes.ApplicationCommandAutocomplete &&
		userIdentifierOption === undefined && durationIdentifier === undefined
	) {
		return;
	}

	const userIdentifier = <string | undefined> userIdentifierOption?.value;

	if (
		interaction.type === InteractionTypes.ApplicationCommandAutocomplete &&
		!userIdentifierOption?.focused
	) {
		const timestamp = getTimestampFromExpression(
			durationIdentifier!,
			interaction.locale,
		);

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
				data: {
					choices: !timestamp
						? []
						: [{ name: timestamp[0], value: timestamp[1].toString() }],
				},
			},
		);
	}

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		userIdentifier!,
	);
	if (!member) return;

	const displayError = (error: string): void => {
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
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	};

	if (member.id === interaction.member?.id) {
		return displayError(
			localise(Commands.timeout.strings.cannotTimeoutSelf, interaction.locale),
		);
	}

	const duration = Number(durationIdentifier);

	if (Number.isNaN(duration)) {
		return displayError(
			localise(Commands.timeout.strings.invalidDuration, interaction.locale),
		);
	}

	if (duration < Periods.minute) {
		return displayError(
			localise(
				Commands.timeout.strings.durationMustBeLongerThanMinute,
				interaction.locale,
			),
		);
	}

	if (duration > Periods.week) {
		return displayError(
			localise(
				Commands.timeout.strings.durationMustBeShorterThanWeek,
				interaction.locale,
			),
		);
	}

	const until = Date.now() + duration;

	await editMember(
		bot,
		interaction.guildId!,
		member.id,
		{ communicationDisabledUntil: until },
	);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	log(
		[client, bot],
		guild,
		'memberTimeoutAdd',
		member,
		until,
		reason,
		interaction.user,
	);

	sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(
					Commands.timeout.strings.timedOut,
					interaction.locale,
				)(mention(member.id, MentionTypes.User), displayTime(until)),
				color: configuration.interactions.responses.colors.blue,
			}],
		},
	});

	const dmChannel = await getDmChannel(bot, member.id);
	if (!dmChannel) {
		const textChannel = client.cache.channels.get(interaction.channelId!);
		if (!textChannel) return;

		const user = member.user;
		if (!user) return;

		return void sendMessage(bot, textChannel.id, {
			embeds: [{
				description: localise(
					Commands.timeout.strings.timedOutWithReason,
					interaction.locale,
				)(mention(member.id, MentionTypes.User), displayTime(until), reason),
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
	}

	return void sendMessage(bot, dmChannel.id, {
		embeds: [
			{
				author: guildAsAuthor(bot, guild),
				description: localise(
					Commands.timeout.strings.timedOutDirect,
					defaultLanguage,
				)(displayTime(until), reason),
				color: configuration.interactions.responses.colors.yellow,
			},
		],
	});
}

const digitsExpression = new RegExp(/\d+/g);
const stringsExpression = new RegExp(/[a-zA-Z]+/g);

function extractNumbers(expression: string): number[] {
	return (expression.match(digitsExpression) ?? []).map((digits) =>
		Number(digits)
	);
}

function extractStrings(expression: string): string[] {
	return expression.match(stringsExpression) ?? [];
}

function getTimestampFromExpression(
	expression: string,
	locale: string | undefined,
): [string, number] | undefined {
	// Extract the digits present in the expression.
	const quantifiers = extractNumbers(expression).map((string) =>
		Number(string)
	);
	// Extract the strings present in the expression.
	const periodNames = extractStrings(expression);

	// No parameters have been provided for both keys and values.
	if (periodNames.length === 0 || quantifiers.length === 0) return undefined;

	// The number of values does not match the number of keys.
	if (quantifiers.length !== periodNames.length) return undefined;

	// One of the values is equal to 0.
	if (quantifiers.includes(0)) return undefined;

	const validTimeDescriptors = timeDescriptors.reduce<string[]>(
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
			const index = timeDescriptors.findIndex(([descriptors, _period]) =>
				localise(descriptors.descriptors, locale).includes(quantifier)
			);

			frequencies[index]++;

			return frequencies;
		},
		Array.from({ length: timeDescriptors.length }, () => 0),
	);

	// If one of the keys is duplicate.
	if (quantifierFrequencies.some((count) => count > 1)) {
		return undefined;
	}

	const keysWithValues: [
		(number: number) => string,
		[number, number],
		number,
	][] = periodNames
		.map(
			(key, index) => {
				const [descriptors, milliseconds] = timeDescriptors.find((
					[descriptors, _value],
				) => localise(descriptors.descriptors, locale).includes(key))!;

				return [localise(descriptors.display, locale), [
					quantifiers.at(index)!,
					quantifiers.at(index)! * milliseconds,
				], index];
			},
		);

	keysWithValues.sort((previous, next) => next[2] - previous[2]);

	const timeExpressions = [];
	let total = 0;
	for (const [display, [quantifier, milliseconds]] of keysWithValues) {
		timeExpressions.push(display(quantifier));
		total += milliseconds;
	}

	const timeExpression = timeExpressions.join(', ');

	return [timeExpression, total];
}

export { setTimeout };
