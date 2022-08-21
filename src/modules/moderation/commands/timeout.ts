import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	dayjs,
	editMember,
	fetchMembers,
	getDmChannel,
	guildIconURL,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/structs/command.ts';
import configuration, {
	minute,
	timeDescriptors,
	week,
} from '../../../configuration.ts';
import { mention } from '../../../formatting.ts';
import { mentionUser, resolveUserIdentifier } from '../../../utils.ts';
import { user } from '../../parameters.ts';
import { duration, reason } from '../parameters.ts';

const command: CommandBuilder = {
	name: 'timeout',
	nameLocalizations: {
		pl: 'timeout',
		ro: 'timeout',
	},
	description: 'Used to manage user timeouts.',
	descriptionLocalizations: {
		pl: 'Komenda używana do zarządzania pauzami użytkowników.',
		ro: 'Comandă utilizată pentru gestionarea pauzelor utilizatorilor.',
	},
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: setTimeout,
	options: [{
		name: 'set',
		nameLocalizations: {
			pl: 'ustaw',
			ro: 'setează',
		},
		description:
			'Times out a user, making them unable to interact on the server.',
		descriptionLocalizations: {
			pl:
				'Uniemożliwia użytkownikowi interakcjonowanie z serwerem (pisanie, mówienie w VC, itp.).',
			ro: 'Face ca un utilizator să nu mai poată interacționa în server.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		options: [user, duration, reason],
		handle: setTimeout,
	}, {
		name: 'clear',
		nameLocalizations: {
			pl: 'usuń',
			ro: 'șterge',
		},
		description: 'Clears a user\'s timeout.',
		descriptionLocalizations: {
			pl:
				'Pozwala użytkownikowi, który dostał timeout, ponownie interakcjonować z serwerem.',
			ro:
				'Permite utilizatorului care a primit un timeout să interacționeze cu serverul.',
		},
		type: ApplicationCommandOptionTypes.SubCommand,
		handle: clearTimeout,
		options: [user],
	}],
};

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

	await fetchMembers(client.bot, interaction.guildId!, { limit: 0, query: '' });

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
					mention(member.id, 'USER')
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
					const iconURL = guildIconURL(client.bot, guild.id, guild.icon);
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

async function clearTimeout(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = interaction.data;
	if (!data) return;

	const userIdentifier = <string | undefined> data.options?.at(0)?.options?.at(
		0,
	)?.value;
	if (!userIdentifier) return;

	await fetchMembers(client.bot, interaction.guildId!, { limit: 0, query: '' });

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

	const member = client.members.get(user.id);
	if (!member) return;

	if (!member.communicationDisabledUntil) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'User not timed out',
						description: 'The provided user is not currently timed out.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	await editMember(client.bot, interaction.guildId!, member.id, {
		// TODO: Remove once the type is made nullable.
		// @ts-ignore: Library issue.
		communicationDisabledUntil: null,
	});

	client.logging.get(interaction.guildId!)?.log(
		'memberTimeoutRemove',
		member,
		interaction.user,
	);

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'Cleared user timeout',
					description: `The timeout of member ${
						mentionUser(user)
					} has been cleared.`,
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
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

export default command;
