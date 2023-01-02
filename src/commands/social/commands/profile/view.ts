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
import { OptionBuilder } from 'logos/src/commands/command.ts';
import { show, user } from 'logos/src/commands/parameters.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.profile.options.view),
	type: ApplicationCommandOptionTypes.SubCommand,
	options: [{ ...user, required: false }, show],
	handle: handleDisplayProfile,
};

async function handleDisplayProfile(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const member = resolveInteractionToMember([client, bot], interaction, user ?? interaction.user.id.toString());
	if (member === undefined) return;

	const target = member.user;
	if (target === undefined) return;

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
						description: localise(Commands.profile.options.view.strings.failed, interaction.locale),
						color: constants.colors.red,
					}],
				},
			},
		);
	}

	const subject = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		member.id.toString(),
		member.id,
	);
	if (subject === undefined) return showProfileViewFailure();

	const [praisesSent, praisesReceived, warningsReceived] = await Promise.all([
		client.database.adapters.praises.getOrFetch(client, 'sender', subject.ref),
		client.database.adapters.praises.getOrFetch(client, 'recipient', subject.ref),
		client.database.adapters.warnings.getOrFetch(client, 'recipient', subject.ref),
	]);
	if (praisesSent === undefined || praisesReceived === undefined || warningsReceived === undefined) {
		return showProfileViewFailure();
	}

	const locale = show ? defaultLocale : interaction.locale;

	const rolesString = localise(Commands.profile.options.view.strings.roles, locale);
	const statisticsString = localise(Commands.profile.options.view.strings.statistics, locale);
	const praisesString = localise(Commands.profile.options.view.strings.praises, locale);
	const warningsString = localise(Commands.profile.options.view.strings.warnings, locale);
	const receivedString = localise(Commands.profile.options.view.strings.received, locale);
	const sentString = localise(Commands.profile.options.view.strings.sent, locale);

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: localise(Commands.profile.options.view.strings.informationForUser, locale)(target.username),
					thumbnail: (() => {
						const iconURL = getAvatarURL(
							bot,
							target.id,
							target.discriminator,
							{ avatar: target.avatar, size: 4096, format: 'webp' },
						);
						if (iconURL === undefined) return;

						return { url: iconURL };
					})(),
					fields: [{
						name: `💼 ${rolesString}`,
						value: member.roles.map((roleId) => mention(roleId, MentionTypes.Role)).join(' '),
						inline: false,
					}, {
						name: `🧮 ${statisticsString}`,
						value:
							`🙏 ${praisesString} • ${receivedString} – ${praisesReceived.size} • ${sentString} – ${praisesSent.size}
😖 ${warningsString} • ${receivedString} – ${warningsReceived.size}`,
						inline: false,
					}],
				}],
			},
		},
	);
}

export default command;
