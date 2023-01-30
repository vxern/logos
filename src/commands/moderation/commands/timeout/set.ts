import {
	ApplicationCommandFlags,
	Bot,
	editMember,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, localise } from 'logos/assets/localisations/mod.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { isAutocomplete, parseArguments, parseTimeExpression } from 'logos/src/interactions.ts';
import { guildAsAuthor } from 'logos/src/utils.ts';
import constants, { Periods } from 'logos/constants.ts';
import { mention, MentionTypes, timestamp } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

async function handleSetTimeout(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, duration, reason }, focused] = parseArguments(interaction.data?.options, {});

	if (
		interaction.type !== InteractionTypes.ApplicationCommandAutocomplete && user === undefined && duration === undefined
	) {
		return;
	}

	if (isAutocomplete(interaction) && focused?.name === 'duration') {
		const timestamp = parseTimeExpression(duration!, true, interaction.locale);

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

	const member = resolveInteractionToMember([client, bot], interaction, user!, {
		restrictToNonSelf: true,
		excludeModerators: true,
	});
	if (member === undefined) return;

	if (isAutocomplete(interaction) && focused?.name === 'user') return;

	const durationParsed = Number(duration);

	if (Number.isNaN(duration)) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.invalidDuration, interaction.locale),
		);
	}

	if (durationParsed < Periods.minute) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.durationMustBeLongerThanMinute, interaction.locale),
		);
	}

	if (durationParsed > Periods.week) {
		return displayError(
			bot,
			interaction,
			localise(Commands.timeout.strings.durationMustBeShorterThanWeek, interaction.locale),
		);
	}

	const until = Date.now() + durationParsed;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [_, dmChannel] = await Promise.all([
		editMember(bot, interaction.guildId!, member.id, { communicationDisabledUntil: until }),
		getDmChannel(bot, member.id).catch(() => undefined),
	]);

	log([client, bot], guild, 'memberTimeoutAdd', member, until, reason!, interaction.user);

	sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Commands.timeout.strings.timedOut, interaction.locale)(
					mention(member.id, MentionTypes.User),
					timestamp(until),
				),
				color: constants.colors.blue,
			}],
		},
	});

	if (dmChannel === undefined) {
		const textChannel = client.cache.channels.get(interaction.channelId!);
		if (textChannel === undefined) return;

		const user = member.user;
		if (user === undefined) return;

		return void sendMessage(bot, textChannel.id, {
			embeds: [{
				description: localise(Commands.timeout.strings.timedOutWithReason, interaction.locale)(
					mention(member.id, MentionTypes.User),
					timestamp(until),
					reason!,
				),
				color: constants.colors.dullYellow,
			}],
		});
	}

	return void sendMessage(bot, dmChannel.id, {
		embeds: [
			{
				author: guildAsAuthor(bot, guild),
				description: localise(Commands.timeout.strings.timedOutDirect, defaultLocale)(timestamp(until), reason!),
				color: constants.colors.dullYellow,
			},
		],
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

export { handleSetTimeout };
