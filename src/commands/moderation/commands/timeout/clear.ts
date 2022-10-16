import {
	ApplicationCommandFlags,
	Bot,
	editMember,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mentionUser } from '../../../../utils.ts';
import { log } from '../../../../controllers/logging.ts';
import { localise } from '../../../../../assets/localisations/types.ts';
import { Commands } from '../../../../../assets/localisations/commands.ts';

async function clearTimeout(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const userIdentifier = <string | undefined> interaction.data?.options?.at(0)
		?.options?.at(
			0,
		)?.value;
	if (userIdentifier === undefined) return;

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		userIdentifier,
	);
	if (!member) return;

	if (!member.communicationDisabledUntil) {
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
							Commands.timeout.strings.notTimedOut,
							interaction.locale,
						),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	await editMember(
		bot,
		interaction.guildId!,
		member.id,
		{ communicationDisabledUntil: undefined },
	);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	log([client, bot], guild, 'memberTimeoutRemove', member, interaction.user);

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
						Commands.timeout.strings.timeoutCleared,
						interaction.locale,
					)(mentionUser(member.user!)),
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export { clearTimeout };
