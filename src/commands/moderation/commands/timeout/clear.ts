import {
	ApplicationCommandFlags,
	editMember,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { mentionUser } from '../../../../utils.ts';

async function clearTimeout(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const userIdentifier = <string | undefined> interaction.data?.options?.at(0)
		?.options?.at(
			0,
		)?.value;
	if (userIdentifier === undefined) return;

	const member = resolveInteractionToMember(
		client,
		interaction,
		userIdentifier,
	);
	if (!member) return;

	if (!member.communicationDisabledUntil) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: 'The provided user is not currently timed out.',
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	await editMember(
		client.bot,
		interaction.guildId!,
		member.id,
		{ communicationDisabledUntil: undefined },
	);

	client.logging.get(interaction.guildId!)?.log(
		'memberTimeoutRemove',
		member,
		interaction.user,
	);

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: `The timeout of member ${
						member.user ? mentionUser(member.user) : undefined
					} has been cleared.`,
					color: configuration.interactions.responses.colors.blue,
				}],
			},
		},
	);
}

export { clearTimeout };
