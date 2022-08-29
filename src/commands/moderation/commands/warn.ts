import {
	ApplicationCommandFlags,
	getDmChannel,
	getGuildIconURL,
	Interaction,
	InteractionResponseTypes,
	kickMember,
	sendInteractionResponse,
	sendMessage,
} from '../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { mention, MentionTypes } from '../../../formatting.ts';
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
	const reason = <string | undefined> data.options?.at(1)?.value;
	if (userIdentifier === undefined || reason === undefined) return;

	const member = resolveInteractionToMember(
		client,
		interaction,
		userIdentifier,
	);
	if (!member) return;

	if (member.id === interaction.member?.id) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: 'You cannot warn yourself!',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const moderatorRoleId = guild.roles.find((role) =>
		role.name === configuration.guilds.moderation.moderator
	)?.id;
	if (!moderatorRoleId) return;

	const isModerator = member.roles.includes(moderatorRoleId);
	if (isModerator) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description:
							`Server ${configuration.guilds.moderation.moderator.toLowerCase()}s cannot be warned.`,
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const displayWarnError = (): void => {
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
	};

	const subject = await client.database.getOrCreateUser(
		'id',
		member.id.toString(),
	);
	if (!subject) return displayWarnError();

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id.toString(),
	);
	if (!author) return displayWarnError();

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return displayWarnError();

	const document = await client.database.createWarning({
		author: author.ref,
		subject: subject.ref,
		reason: reason,
	});
	if (!document) return displayWarnError();

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

	const dmChannel = await getDmChannel(client.bot, member.id);
	if (dmChannel) {
		sendMessage(client.bot, dmChannel.id, {
			embeds: [
				{
					thumbnail: (() => {
						const iconURL = getGuildIconURL(client.bot, guild.id, guild.icon, {
							size: 4096,
							format: 'webp',
						});
						if (!iconURL) return;

						return { url: iconURL };
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
			member.id,
			'Kicked due to having received too many warnings.',
		);
	}
}

export default command;
