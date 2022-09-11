import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	dayjs,
	getAvatarURL,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { getPraises } from '../../../../database/functions/praises.ts';
import { getOrCreateUser } from '../../../../database/functions/users.ts';
import { getWarnings } from '../../../../database/functions/warnings.ts';
import { displayTime, mention, MentionTypes } from '../../../../formatting.ts';
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
	options: [{ ...user, required: false }, show],
	handle: viewProfile,
};

async function viewProfile(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const userIdentifier = <string | undefined> interaction.data?.options?.at(0)
		?.options?.at(0)?.value;

	const show =
		(<boolean | undefined> interaction.data?.options?.at(0)?.options?.find((
			option,
		) => option.name === 'show')
			?.value) ?? false;

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		userIdentifier ?? interaction.user.id.toString(),
	);
	if (!member) return;

	const user = member.user;
	if (!user) return;

	function showProfileViewFailure(): void {
		return void sendInteractionResponse(
			bot,
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

	const subject = await getOrCreateUser(
		client.database,
		'id',
		member.id.toString(),
	);
	if (!subject) return showProfileViewFailure();

	const praisesReceived = await getPraises(
		client.database,
		'subject',
		subject.ref,
	);
	if (!praisesReceived) return showProfileViewFailure();

	const praisesGiven = await getPraises(client.database, 'author', subject.ref);
	if (!praisesGiven) return showProfileViewFailure();

	const warningsReceived = await getWarnings(client.database, subject.ref);
	if (!warningsReceived) return showProfileViewFailure();

	return void sendInteractionResponse(
		bot,
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
							bot,
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
						value: `Joined server: ${displayTime(joinedAt)}
Created account: ${displayTime(createdAt)}`,
						inline: false,
					}, {
						name: '🧮 Statistics',
						value:
							`🙏 Praises - ${praisesReceived.length} Received | ${praisesGiven.length} Given
😖 Warnings - ${warningsReceived.length} Received`,
						inline: false,
					}],
				}],
			},
		},
	);
}

export default command;
