import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	editOriginalInteractionResponse,
	getDmChannel,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { CommandBuilder } from 'logos/src/commands/command.ts';
import { user } from 'logos/src/commands/parameters.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Praise } from 'logos/src/database/structs/users/praise.ts';
import { createPraise, getPraises } from 'logos/src/database/functions/praises.ts';
import { getOrCreateUser } from 'logos/src/database/functions/users.ts';
import { Client, resolveInteractionToMember } from 'logos/src/client.ts';
import { guildAsAuthor, parseArguments } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.praise),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handlePraiseUser,
	options: [user, {
		...createLocalisations(Commands.praise.options.comment),
		type: ApplicationCommandOptionTypes.String,
	}],
};

async function handlePraiseUser(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, comment }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember([client, bot], interaction, user);
	if (member === undefined) return;

	if (member.id === interaction.member?.id) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Commands.praise.strings.cannotPraiseSelf, interaction.locale),
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	await sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.DeferredChannelMessageWithSource,
		data: { flags: ApplicationCommandFlags.Ephemeral },
	});

	const [author, subject] = await Promise.all([
		getOrCreateUser(client, 'id', interaction.user.id.toString()),
		getOrCreateUser(client, 'id', member.id.toString()),
	]);

	if (author === undefined || subject === undefined) return showError(bot, interaction);

	const praisesByAuthor = await getPraises(client, 'author', author.ref);
	if (praisesByAuthor === undefined) return showError(bot, interaction);

	const praiseTimestamps = praisesByAuthor
		.map((document) => document.ts)
		.toSorted((a, b) => b - a); // From most recent to least recent.
	const timestampSlice = praiseTimestamps.slice(0, configuration.guilds.praises.maximum);
	const canPraise = timestampSlice.length < configuration.guilds.praises.maximum ||
		timestampSlice.some(
			(timestamp) => (Date.now() - timestamp) >= configuration.guilds.praises.interval,
		);
	if (!canPraise) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(Commands.praise.strings.waitBeforePraising, interaction.locale),
					color: configuration.interactions.responses.colors.yellow,
				}],
			},
		);
	}

	const praise: Praise = { author: author.ref, subject: subject.ref, comment: comment };

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const [document, dmChannel] = await Promise.all([
		createPraise(client, praise),
		getDmChannel(bot, member.id).catch(() => undefined),
	]);

	if (document === undefined) return showError(bot, interaction);

	log([client, bot], guild, 'praiseAdd', member, praise, interaction.user);

	if (dmChannel !== undefined) {
		const praisedString = localise(Commands.praise.strings.praisedDirect, interaction.locale)(
			mention(interaction.user.id, MentionTypes.User),
		);

		sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: guildAsAuthor(bot, guild),
					description: `${praisedString} 🥳`,
					color: configuration.interactions.responses.colors.green,
				},
			],
		});
	}

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				description: localise(Commands.praise.strings.praised, interaction.locale)(
					mention(member.id, MentionTypes.User),
				),
				color: configuration.interactions.responses.colors.green,
			}],
		},
	);
}

function showError(bot: Bot, interaction: Interaction): void {
	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			embeds: [{
				description: localise(Commands.praise.strings.failed, interaction.locale),
				color: configuration.interactions.responses.colors.red,
			}],
		},
	);
}

export default command;
