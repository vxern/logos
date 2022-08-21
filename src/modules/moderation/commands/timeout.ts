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
import configuration, { minute, week } from '../../../configuration.ts';
import { mention } from '../../../formatting.ts';
import { mentionUser, resolveUserIdentifier } from '../../../utils.ts';
import { user } from '../../parameters.ts';
import { getTimestampFromExpression } from '../module.ts';
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

export default command;
