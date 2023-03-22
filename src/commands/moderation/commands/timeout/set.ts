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
import { parseArguments, parseTimeExpression } from 'logos/src/interactions.ts';
import constants, { Periods } from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';

async function handleSetTimeoutAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, duration }, focused] = parseArguments(interaction.data?.options, {});

	switch (focused!.name) {
		case 'user': {
			if (focused!.name === 'user') {
				return autocompleteMembers(
					[client, bot],
					interaction,
					user!,
					{ restrictToNonSelf: true, excludeModerators: true },
				);
			}
			break;
		}
		case 'duration': {
			if (focused!.name === 'duration') {
				const timestamp = parseTimeExpression(client, duration!, true, interaction.locale);

				return void sendInteractionResponse(
					bot,
					interaction.id,
					interaction.token,
					{
						type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
						data: {
							choices: timestamp === undefined ? [] : [{ name: timestamp[0], value: timestamp[1].toString() }],
						},
					},
				);
			}
			break;
		}
	}
}

async function handleSetTimeout([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, duration, reason }] = parseArguments(interaction.data?.options, {});
	if (user === undefined || duration === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user!, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	const durationParsed = Number(duration);

	if (Number.isNaN(duration)) {
		return displayError(
			bot,
			interaction,
			localise(client, 'timeout.strings.invalidDuration', interaction.locale)(),
		);
	}

	if (durationParsed < Periods.minute) {
		return displayError(
			bot,
			interaction,
			localise(client, 'timeout.strings.durationCannotBeLessThanOneMinute', interaction.locale)(),
		);
	}

	if (durationParsed > Periods.week) {
		return displayError(
			bot,
			interaction,
			localise(client, 'timeout.strings.durationMustBeShorterThanWeek', interaction.locale)(),
		);
	}

	const until = Date.now() + durationParsed;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	await editMember(bot, interaction.guildId!, member.id, { communicationDisabledUntil: until }),
		logEvent([client, bot], guild, 'memberTimeoutAdd', [member, until, reason!, interaction.user]);

	sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(client, 'timeout.strings.timedOut', interaction.locale)(
					{
						'user_mention': mention(member.id, MentionTypes.User),
						'relative_timestamp': timestamp(until),
					},
				),
				color: constants.colors.blue,
			}],
		},
	});
}

function displayError(bot: Bot, interaction: Interaction, error: string): void {
	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					description: error,
					color: constants.colors.dullYellow,
				}],
			},
		},
	);
}

export { handleSetTimeout, handleSetTimeoutAutocomplete };
