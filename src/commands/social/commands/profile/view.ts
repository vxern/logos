import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	getAvatarURL,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { getOrCreateUser, getPraises, getWarnings } from 'logos/src/database/functions/mod.ts';
import { OptionBuilder, show, user } from 'logos/src/commands/mod.ts';
import { Client, configuration, parseArguments, resolveInteractionToMember } from 'logos/src/mod.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLanguage } from 'logos/types.ts';

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
	const [{ user, show }] = parseArguments(interaction.data?.options, {
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

	const subject = await getOrCreateUser(client, 'id', member.id.toString());
	if (!subject) return showProfileViewFailure();

	const praisesReceived = await getPraises(client, 'subject', subject.ref);
	if (!praisesReceived) return showProfileViewFailure();

	const praisesSent = await getPraises(client, 'author', subject.ref);
	if (!praisesSent) return showProfileViewFailure();

	const warningsReceived = await getWarnings(client, subject.ref);
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
						value: member.roles.map((roleId) => mention(roleId, MentionTypes.Role)).join(' '),
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
