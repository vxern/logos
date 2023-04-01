import {
	ApplicationCommandFlags,
	Bot,
	editMember,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import { diagnosticMentionUser } from 'logos/src/utils.ts';
import constants from 'logos/constants.ts';

async function handleClearTimeoutAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	return autocompleteMembers([client, bot], interaction, user!, { restrictToNonSelf: true, excludeModerators: true });
}

async function handleClearTimeout([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	const timedOutUntil = member.communicationDisabledUntil ?? undefined;

	const notTimedOut = timedOutUntil === undefined || timedOutUntil < Date.now();

	if (notTimedOut) {
		const strings = {
			notTimedOut: localise(client, 'timeout.strings.notTimedOut', interaction.locale)(),
		};

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: strings.notTimedOut,
						color: constants.colors.dullYellow,
					}],
				},
			},
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	await editMember(bot, interaction.guildId!, member.id, { communicationDisabledUntil: null });

	logEvent([client, bot], guild, 'memberTimeoutRemove', [member, interaction.user]);

	const strings = {
		timeoutCleared: localise(client, 'timeout.strings.timeoutCleared', interaction.locale)(
			{ 'user_mention': diagnosticMentionUser(member.user!) },
		),
	};

	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: strings.timeoutCleared,
					color: constants.colors.lightGreen,
				}],
			},
		},
	);
}

export { handleClearTimeout, handleClearTimeoutAutocomplete };
