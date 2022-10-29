import { Commands } from '../../../../../assets/localisations/commands.ts';
import {
	createLocalisations,
	localise,
} from '../../../../../assets/localisations/types.ts';
import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
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
import { mention, MentionTypes } from '../../../../formatting.ts';
import { defaultLanguage } from '../../../../types.ts';
import { parseArguments } from '../../../../utils.ts';
import { OptionBuilder } from '../../../command.ts';
import { show, user } from '../../../parameters.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.profile.options.view),
	type: ApplicationCommandOptionTypes.SubCommand,
	options: [{ ...user, required: false }, show],
	handle: viewProfile,
};

async function viewProfile(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, show }] = parseArguments(interaction.data!.options, {
		show: 'boolean',
	});

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user ?? interaction.user.id.toString(),
	);
	if (!member) return;

	const target = member.user;
	if (!target) return;

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
						description: localise(
							Commands.profile.options.view.strings.failed,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

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

	const praisesSent = await getPraises(client.database, 'author', subject.ref);
	if (!praisesSent) return showProfileViewFailure();

	const warningsReceived = await getWarnings(client.database, subject.ref);
	if (!warningsReceived) return showProfileViewFailure();

	const locale = !show ? interaction.locale : defaultLanguage;

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: localise(
						Commands.profile.options.view.strings.informationForUser,
						locale,
					)(target.username),
					thumbnail: (() => {
						const iconURL = getAvatarURL(
							bot,
							target.id,
							target.discriminator,
							{ avatar: target.avatar, size: 4096, format: 'webp' },
						);
						if (!iconURL) return;

						return { url: iconURL };
					})(),
					fields: [{
						name: `💼 ${
							localise(
								Commands.profile.options.view.strings.roles,
								locale,
							)
						}`,
						value: member.roles.map((roleId) =>
							mention(roleId, MentionTypes.Role)
						).join(' '),
						inline: false,
					}, {
						name: `🧮 ${
							localise(
								Commands.profile.options.view.strings.statistics,
								locale,
							)
						}`,
						value: `🙏 ${
							localise(
								Commands.profile.options.view.strings.praises,
								locale,
							)
						} — ${
							localise(
								Commands.profile.options.view.strings.received,
								locale,
							)
						} ${praisesReceived.length} • ${
							localise(
								Commands.profile.options.view.strings.sent,
								locale,
							)
						} ${praisesSent.length}
😖 ${
							localise(
								Commands.profile.options.view.strings.warnings,
								locale,
							)
						} — ${
							localise(
								Commands.profile.options.view.strings.received,
								locale,
							)
						} ${warningsReceived.length}`,
						inline: false,
					}],
				}],
			},
		},
	);
}

export default command;
