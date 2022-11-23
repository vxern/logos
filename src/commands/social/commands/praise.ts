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
import { Praise } from 'logos/src/database/structs/users/mod.ts';
import { createPraise, getOrCreateUser, getPraises } from 'logos/src/database/functions/mod.ts';
import { log } from 'logos/src/controllers/logging/mod.ts';
import { CommandBuilder, user } from 'logos/src/commands/mod.ts';
import { Client, configuration, guildAsAuthor, parseArguments, resolveInteractionToMember } from 'logos/src/mod.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';

const command: CommandBuilder = {
	...createLocalisations(Commands.praise),
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: praise,
	options: [user, {
		...createLocalisations(Commands.praise.options.comment),
		type: ApplicationCommandOptionTypes.String,
	}],
};

async function praise(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): Promise<void> {
	const [{ user, comment }] = parseArguments(interaction.data?.options, {});
	if (user === undefined) return;

	const member = resolveInteractionToMember(
		[client, bot],
		interaction,
		user,
	);
	if (!member) return;

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
						description: localise(
							Commands.praise.strings.cannotPraiseSelf,
							interaction.locale,
						),
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

	const showPraiseFailure = (): void => {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(
						Commands.praise.strings.failed,
						interaction.locale,
					),
					color: configuration.interactions.responses.colors.red,
				}],
			},
		);
	};

	const author = await getOrCreateUser(client, 'id', interaction.user.id.toString());
	if (!author) return showPraiseFailure();

	const praisesByAuthor = await getPraises(client, 'author', author.ref);
	if (!praisesByAuthor) return showPraiseFailure();

	const praiseTimestamps = praisesByAuthor
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.
	const timestampSlice = praiseTimestamps.slice(0, configuration.guilds.praises.maximum);
	const canPraise = timestampSlice.length < configuration.guilds.praises.maximum ||
		timestampSlice.some((timestamp) => (Date.now() - timestamp) >= configuration.guilds.praises.interval);
	if (!canPraise) {
		return void editOriginalInteractionResponse(
			bot,
			interaction.token,
			{
				embeds: [{
					description: localise(
						Commands.praise.strings.waitBeforePraising,
						interaction.locale,
					),
					color: configuration.interactions.responses.colors.yellow,
				}],
			},
		);
	}

	const subject = await getOrCreateUser(client, 'id', member.id.toString());
	if (!subject) return showPraiseFailure();

	const praise: Praise = {
		author: author.ref,
		subject: subject.ref,
		comment: comment,
	};

	const document = await createPraise(client, praise);
	if (!document) return showPraiseFailure();

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	log([client, bot], guild, 'praiseAdd', member, praise, interaction.user);

	const dmChannel = await getDmChannel(bot, member.id);
	if (dmChannel) {
		sendMessage(bot, dmChannel.id, {
			embeds: [
				{
					author: guildAsAuthor(bot, guild),
					description: `${
						localise(Commands.praise.strings.praisedDirect, interaction.locale)(
							mention(interaction.user.id, MentionTypes.User),
						)
					} 🥳`,
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
				description: localise(
					Commands.praise.strings.praised,
					interaction.locale,
				)(mention(member.id, MentionTypes.User)),
				color: configuration.interactions.responses.colors.green,
			}],
		},
	);
}

export default command;
