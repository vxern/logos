import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	getDmChannel,
	getGuildIconURL,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../deps.ts';
import { Client, resolveInteractionToMember } from '../../../client.ts';
import { CommandBuilder } from '../../../commands/command.ts';
import configuration from '../../../configuration.ts';
import { Praise } from '../../../database/structs/users/praise.ts';
import { mention, MentionTypes } from '../../../formatting.ts';
import { user } from '../../parameters.ts';

const command: CommandBuilder = {
	name: 'praise',
	nameLocalizations: {
		pl: 'pochwal',
		ro: 'lăudare',
	},
	description: 'Praises a user for their contribution.',
	descriptionLocalizations: {
		pl: 'Chwali użytkownika za jego wkład.',
		ro: 'Laudă un utilizator pentru contribuțiile sale.',
	},
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: praise,
	options: [user, {
		name: 'comment',
		nameLocalizations: {
			pl: 'komentarz',
			ro: 'comentariu',
		},
		description: 'A comment to attach to the praise.',
		descriptionLocalizations: {
			pl: 'Komentarz, który ma zostać załączony do pochwały.',
			ro: 'Comentariul care să fie atașat la laudă.',
		},
		type: ApplicationCommandOptionTypes.String,
	}],
};

async function praise(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const data = interaction.data;
	if (!data) return;

	const userIdentifier = <string | undefined> data.options?.at(0)?.value;
	if (userIdentifier === undefined) return;

	const member = resolveInteractionToMember(
		client,
		interaction,
		userIdentifier,
	);
	if (!member) return;

	const comment = <string | undefined> data.options?.at(1)?.value;

	if (member.id === interaction.member?.id) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: 'You cannot praise yourself!',
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const showPraiseFailure = (): void => {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to praise user',
						description: `Your praise failed to be submitted.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	};

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id.toString(),
	);
	if (!author) return showPraiseFailure();

	const praisesByAuthor = await client.database.getPraises(
		'author',
		author.ref,
	);
	if (!praisesByAuthor) return showPraiseFailure();

	const praiseTimestamps = praisesByAuthor
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.
	const timestampSlice = praiseTimestamps.slice(
		0,
		configuration.guilds.praises.maximum,
	);
	const canPraise = timestampSlice.length <
			configuration.guilds.praises.maximum ||
		timestampSlice.some((timestamp) =>
			(Date.now() - timestamp) >=
				configuration.guilds.praises.interval
		);
	if (!canPraise) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Wait before praising again',
						description:
							`You have already praised a user recently. You must wait before praising somebody again.`,
						color: configuration.interactions.responses.colors.yellow,
					}],
				},
			},
		);
	}

	const subject = await client.database.getOrCreateUser(
		'id',
		member.id.toString(),
	);
	if (!subject) return showPraiseFailure();

	const praise: Praise = {
		author: author.ref,
		subject: subject.ref,
		comment: comment,
	};

	const document = await client.database.createPraise(praise);
	if (!document) return showPraiseFailure();

	// Log change.

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	const dmChannel = await getDmChannel(client.bot, member.id);
	if (dmChannel) {
		sendMessage(client.bot, dmChannel.id, {
			embeds: [
				{
					thumbnail: (() => {
						const iconURL = getGuildIconURL(client.bot, guild.id, guild.icon);
						if (!iconURL) return undefined;

						return {
							url: iconURL,
						};
					})(),
					title: 'You have been praised!',
					description: `The user ${
						mention(interaction.user.id, MentionTypes.User)
					} has praised you for your contributions.`,
					color: configuration.interactions.responses.colors.green,
				},
			],
		});
	}

	return void sendInteractionResponse(
		client.bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'User praised',
					description:
						`The user has been praised and notified (if they have their DMs open).`,
					color: configuration.interactions.responses.colors.green,
				}],
			},
		},
	);
}

export default command;
