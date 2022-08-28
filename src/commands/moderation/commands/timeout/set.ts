import {
	ApplicationCommandFlags,
	dayjs,
	editMember,
	getDmChannel,
	getGuildIconURL,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration, {
	minute,
	timeDescriptors,
	week,
} from '../../../../configuration.ts';
import { mention, MentionTypes } from '../../../../formatting.ts';
import { mentionUser, resolveUserIdentifier } from '../../../../utils.ts';

async function setTimeout(
	client: Client,
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
	if (!(userIdentifierOption && durationIdentifier && reason)) return;

	const userIdentifier = <string> userIdentifierOption.value;

	const members = Array.from(client.members.values()).filter((member) =>
		member.guildId === interaction.guildId!
	);

	const matchingUsers = resolveUserIdentifier(
		client,
		interaction.guildId!,
		members,
		userIdentifier,
	);
	if (!matchingUsers) return undefined;

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		if (userIdentifierOption.focused) {
			return void sendInteractionResponse(
				client.bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
					data: {
						choices: matchingUsers.slice(0, 20).map((user) => ({
							name: mentionUser(user, true),
							value: user.id.toString(),
						})),
					},
				},
			);
		}

		const timestamp = getTimestampFromExpression(durationIdentifier);

		return void sendInteractionResponse(
			client.bot,
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

	if (matchingUsers.length === 0) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Invalid user',
						description:
							'The provided user identifier is invalid, and does not match to a guild member.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const user = matchingUsers[0]!;

	if (user.id === interaction.member?.id) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Invalid user',
						description: 'You cannot time yourself out!',
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const duration = Number(durationIdentifier);

	if (Number.isNaN(duration)) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Invalid timestamp',
						description: 'The provided duration is invalid.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (duration < minute) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Invalid timestamp',
						description: 'The duration must be longer than a minute.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	if (duration > week) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Invalid timestamp',
						description: 'The duration must not be longer than a week.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const until = new Date(Date.now() + duration);

	const member = await editMember(client.bot, interaction.guildId!, user.id, {
		// TODO: Verify works.
		communicationDisabledUntil: until.getUTCMilliseconds(),
	});

	client.logging.get(interaction.guildId!)?.log(
		'memberTimeoutAdd',
		member,
		until,
		reason,
		interaction.user,
	);

	sendInteractionResponse(client.bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				title: 'Member timed out',
				description: `Member ${
					mention(member.id, MentionTypes.User)
				} has been timed out for a duration of ${dayjs(until).fromNow(true)}.`,
				color: configuration.interactions.responses.colors.blue,
			}],
		},
	});

	const dmChannel = await getDmChannel(client.bot, interaction.user.id);
	if (!dmChannel) {
		const textChannel = client.channels.get(interaction.channelId!);
		if (!textChannel) return;

		return void sendMessage(client.bot, textChannel.id, {
			embeds: [{
				description: `${
					mentionUser(user)
				} has been timed out for a duration of ${
					dayjs(until).fromNow(true)
				} for: ${reason}`,
				color: configuration.interactions.responses.colors.yellow,
			}],
		});
	}

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	return void sendMessage(client.bot, dmChannel.id, {
		embeds: [
			{
				thumbnail: (() => {
					const iconURL = getGuildIconURL(client.bot, guild.id, guild.icon);
					if (!iconURL) return undefined;

					return {
						url: iconURL,
					};
				})(),
				title: 'You have been timed out',
				description: `You have been timed out for a duration of ${
					dayjs(until).fromNow(true)
				} for: ${reason}`,
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

const timeDescriptorUnits = timeDescriptors.map(([descriptors, _value]) =>
	descriptors
);
const allValidTimeDescriptors = timeDescriptors.reduce<string[]>(
	(timeDescriptors, [next, _value]) => {
		timeDescriptors.push(...next);
		return timeDescriptors;
	},
	[],
);

function getTimestampFromExpression(
	expression: string,
): [string, number] | undefined {
	// Extract the digits present in the expression.
	const values = extractNumbers(expression).map((string) => Number(string));
	// Extract the strings present in the expression.
	const keys = extractStrings(expression);

	// No parameters have been provided for both keys and values.
	if (keys.length === 0 || values.length === 0) return undefined;

	// The number of values does not match the number of keys.
	if (values.length !== keys.length) return undefined;

	// One of the values is equal to 0.
	if (values.includes(0)) return undefined;

	// If one of the keys is invalid.
	if (keys.some((key) => !allValidTimeDescriptors.includes(key))) {
		return undefined;
	}

	const distributionOfKeysInTimeDescriptorUnits = keys.reduce(
		(distribution, key) => {
			const index = timeDescriptorUnits.findIndex((distribution) =>
				distribution.includes(key)
			);

			distribution[index]++;

			return distribution;
		},
		Array.from({ length: timeDescriptors.length }, () => 0),
	);

	// If one of the keys is duplicate.
	if (distributionOfKeysInTimeDescriptorUnits.some((count) => count > 1)) {
		return undefined;
	}

	const keysWithValues: [string, [number, number]][] = keys.map(
		(key, index) => {
			const [descriptors, milliseconds] = timeDescriptors.find((
				[descriptors, _value],
			) => descriptors.includes(key))!;

			return [descriptors[descriptors.length - 1]!, [
				values[index]!,
				values[index]! * milliseconds,
			]];
		},
	);

	const timeExpressions = [];
	let total = 0;
	for (const [key, [nominal, milliseconds]] of keysWithValues) {
		timeExpressions.push(`${nominal} ${key}`);
		total += milliseconds;
	}

	const timeExpression = timeExpressions.join(' ');

	return [timeExpression, total];
}

export { setTimeout };
