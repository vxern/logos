import {
	ApplicationCommandFlags,
	Bot,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { Commands, createLocalisations, Information, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { show } from 'logos/src/commands/parameters.ts';
import { Client } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import { BulletStyles, list, mention, MentionTypes } from 'logos/formatting.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.policy),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleDisplayModerationPolicy,
	options: [show],
};

function handleDisplayModerationPolicy([client, bot]: [Client, Bot], interaction: Interaction): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [{ show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const moderatorRoleId = guild.roles.array().find(
		(role) => role.name === configuration.permissions.moderatorRoleName,
	)?.id;
	const moderatorRoleMention = moderatorRoleId !== undefined
		? mention(moderatorRoleId, MentionTypes.Role)
		: configuration.permissions.moderatorRoleName.toLowerCase();

	return void sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
			embeds: [{
				title: localise(Information.rules.moderationPolicy.header, interaction.locale),
				description: list([
					localise(Information.rules.moderationPolicy.body.points.one, interaction.locale)(moderatorRoleMention),
					localise(Information.rules.moderationPolicy.body.points.two, interaction.locale),
					localise(Information.rules.moderationPolicy.body.points.three, interaction.locale),
					localise(Information.rules.moderationPolicy.body.points.four, interaction.locale),
				], BulletStyles.Arrow),
			}],
		},
	});
}

export default command;
