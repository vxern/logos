import {
	ApplicationCommandFlags,
	fetchMembers,
	getDmChannel,
	getGuildIconURL,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	kickMember,
	sendInteractionResponse,
	sendMessage,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { mention, MentionTypes } from '../../../formatting.ts';
import { mentionUser, resolveUserIdentifier } from '../../../utils.ts';
import { user } from '../../parameters.ts';
import { getRelevantWarnings } from '../module.ts';
import { reason } from '../parameters.ts';

const command: CommandBuilder = {
	name: 'warn',
	nameLocalizations: {
		pl: 'ostrzeż',
		ro: 'avertizează',
	},
	description: 'Warns a user.',
	descriptionLocalizations: {
		pl: 'Ostrzega użytkownika.',
		ro: 'Avertizează un utilizator.',
	},
	defaultMemberPermissions: ['MODERATE_MEMBERS'],
	handle: warnUser,
	options: [user, reason],
};

async function warnUser(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = interaction.data;
	if (!data) return;

	const userIdentifier = <string | undefined> data.options?.at(0)?.value;
	const reason = <string | undefined> data.options?.at(0)?.value;
	if (!userIdentifier || !reason) return;

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
	if (!matchingUsers) return;

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

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const enforcerRoleId = guild.roles.find((role) =>
		role.name === configuration.guilds.moderation.moderator
	)?.id;
	if (!enforcerRoleId) return;

	const member = client.members.get(user.id);
	if (!member) return;

	const isGuide = member.roles.includes(enforcerRoleId);
	if (isGuide) {
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
							`Bots and server ${configuration.guilds.moderation.moderator.toLowerCase()}s cannot be warned.`,
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	function showWarnFailure(interaction: Interaction): unknown {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to warn user',
						description: `Your warning failed to be submitted.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const subject = await client.database.getOrCreateUser(
		'id',
		member.id.toString(),
	);
	if (!subject) return void showWarnFailure(interaction);

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id.toString(),
	);
	if (!author) return void showWarnFailure(interaction);

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return void showWarnFailure(interaction);

	const document = await client.database.createWarning({
		author: author.ref,
		subject: subject.ref,
		reason: reason,
	});
	if (!document) return void showWarnFailure(interaction);

	client.logging.get(interaction.guildId!)?.log(
		'memberWarnAdd',
		member!,
		document.data,
		interaction.user,
	);

	const relevantWarnings = getRelevantWarnings(warnings);

	sendInteractionResponse(client.bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				title: 'Member warned',
				description: `Member ${
					mention(member!.id, MentionTypes.User)
				} has been warned. They now have ${relevantWarnings.length} warnings.`,
				color: configuration.interactions.responses.colors.blue,
			}],
		},
	});

	const passedMaximum =
		relevantWarnings.length > configuration.guilds.moderation.warnings.maximum;

	const dmChannel = await getDmChannel(client.bot, interaction.user.id);
	if (dmChannel) {
		sendMessage(client.bot, dmChannel.id, {
			embeds: [
				{
					thumbnail: (() => {
						const iconURL = getGuildIconURL(client.bot, guild.id, guild.icon);
						if (!iconURL) return undefined;

						return {
							url: iconURL,
						};
					})(),
					...(passedMaximum
						? {
							title: 'You have been kicked',
							description:
								`You have received a warning for: ${reason}\n\nYou have surpassed the maximum number of warnings, and have subsequently been kicked.`,
							color: configuration.interactions.responses.colors.red,
						}
						: {
							title: 'You have been warned',
							description:
								`You have received a warning for: ${reason}\n\nThis is warning ${relevantWarnings.length}/${configuration.guilds.moderation.warnings.maximum}.`,
							color: configuration.interactions.responses.colors.yellow,
						}),
				},
			],
		});
	}

	if (passedMaximum) {
		return kickMember(
			client.bot,
			interaction.guildId!,
			user.id,
			'Kicked due to having received too many warnings.',
		);
	}
}

export default command;
