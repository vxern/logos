import {
	ApplicationCommandFlags,
	dayjs,
	fetchMembers,
	getAvatarURL,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mention, MentionTypes } from '../../../../formatting.ts';
import {
	mentionUser,
	resolveUserIdentifier,
	snowflakeToTimestamp,
} from '../../../../utils.ts';

async function viewProfile(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const userIdentifier = <string | undefined> interaction.data?.options?.at(0)
		?.options?.at(0)?.value;
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

	function showProfileViewFailure(): void {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to show profile',
						description: 'Failed to show information about the chosen member.',
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const user = matchingUsers[0]!;

	const member = client.members.get(user.id);
	if (!member) return;

	// TODO: Remove @everyone role.

	const createdAt = dayjs(snowflakeToTimestamp(user.id));
	const joinedAt = dayjs(member.joinedAt);

	const subject = await client.database.getOrCreateUser(
		'id',
		member.id.toString(),
	);
	if (!subject) return showProfileViewFailure();

	const praisesReceived = await client.database.getPraises(
		'subject',
		subject.ref,
	);
	if (!praisesReceived) return showProfileViewFailure();

	const praisesGiven = await client.database.getPraises('author', subject.ref);
	if (!praisesGiven) return showProfileViewFailure();

	const warnings = await client.database.getWarnings(subject.ref);
	if (!warnings) return showProfileViewFailure();

	sendInteractionResponse(client.bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			embeds: [{
				title: `Information for ${user.username}`,
				thumbnail: (() => {
					const iconURL = getAvatarURL(client.bot, user.id, user.discriminator);
					if (!iconURL) return undefined;

					return {
						url: iconURL,
					};
				})(),
				fields: [{
					name: '💼 Roles',
					value: member.roles.map((roleId) =>
						mention(roleId, MentionTypes.Role)
					).join(' '),
					inline: false,
				}, {
					name: '📅 Dates',
					value: `Joined server: ${
						joinedAt.format('Do [of] MMMM YYYY')
					} (${joinedAt.fromNow()})\nCreated account: ${
						createdAt.format('Do [of] MMMM YYYY')
					} (${createdAt.fromNow()})`,
					inline: false,
				}, {
					name: '🙏 Praises',
					value:
						`Received: ${praisesReceived.length}\nGiven: ${praisesGiven.length}`,
					inline: true,
				}, {
					name: `😖 Warnings`,
					value: `Received: ${warnings.length}`,
					inline: true,
				}],
			}],
		},
	});
}

export { viewProfile };
