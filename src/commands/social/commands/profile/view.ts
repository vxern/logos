import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	dayjs,
	getAvatarURL,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mention, MentionTypes } from '../../../../formatting.ts';
import { snowflakeToTimestamp } from '../../../../utils.ts';
import { OptionBuilder } from '../../../command.ts';
import { show, user } from '../../../parameters.ts';

const command: OptionBuilder = {
	name: 'view',
	nameLocalizations: {
		pl: 'wyświetl',
		ro: 'afișare',
	},
	description: 'Displays a user\'s profile.',
	descriptionLocalizations: {
		pl: 'Wyświetla profil użytkownika.',
		ro: 'Afișează profilul unui utilizator.',
	},
	type: ApplicationCommandOptionTypes.SubCommand,
	options: [user, show],
	handle: viewProfile,
};

async function viewProfile(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const userIdentifier = <string | undefined> interaction.data?.options?.at(0)
		?.options?.at(0)?.value;
	if (userIdentifier === undefined) return;

	const show =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.find((
			option,
		) => option.name === 'show')
			?.value) ?? false;

	const member = resolveInteractionToMember(
		client,
		interaction,
		userIdentifier,
	);
	if (!member) return;

	const user = member.user;
	if (!user) return;

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

	const createdAt = dayjs(snowflakeToTimestamp(member.id));
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

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: `Information for ${user.username}`,
					thumbnail: (() => {
						const iconURL = getAvatarURL(
							client.bot,
							user.id,
							user.discriminator,
							{ avatar: user.avatar, size: 4096, format: 'webp' },
						);
						if (!iconURL) return;

						return { url: iconURL };
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
		},
	);
}

export default command;
