import {
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	getAvatarURL,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
} from 'discordeno';
import { OptionTemplate } from 'logos/src/commands/command.ts';
import { show, user } from 'logos/src/commands/parameters.ts';
import { autocompleteMembers, Client, localise, resolveInteractionToMember } from 'logos/src/client.ts';
import { parseArguments } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';

const command: OptionTemplate = {
	name: 'view',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleDisplayProfile,
	handleAutocomplete: handleDisplayProfileAutocomplete,
	options: [{ ...user, required: false }, show],
};

async function handleDisplayProfileAutocomplete([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user }] = parseArguments(interaction.data?.options, {});

	return autocompleteMembers([client, bot], interaction, user!);
}

async function handleDisplayProfile([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const [{ user, show }] = parseArguments(interaction.data?.options, { show: 'boolean' });

	const member = resolveInteractionToMember([client, bot], interaction, user ?? interaction.user.id.toString());
	if (member === undefined) return;

	const target = member.user;
	if (target === undefined) return;

	function showProfileViewFailure(): void {
		const strings = {
			failed: localise(client, 'profile.options.view.strings.failed', interaction.locale)(),
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
						description: strings.failed,
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

	const strings = {
		title: localise(client, 'profile.options.view.strings.informationForUser', locale)({
			'username': target.username,
		}),
		roles: localise(client, 'profile.options.view.strings.roles', locale)(),
		statistics: localise(client, 'profile.options.view.strings.statistics', locale)(),
		praises: localise(client, 'profile.options.view.strings.praises', locale)(),
		warnings: localise(client, 'profile.options.view.strings.warnings', locale)(),
		received: localise(client, 'profile.options.view.strings.received', locale)(),
		sent: localise(client, 'profile.options.view.strings.sent', locale)(),
	};

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: !show ? ApplicationCommandFlags.Ephemeral : undefined,
				embeds: [{
					title: strings.title,
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
						name: `${constants.symbols.profile.roles} ${strings.roles}`,
						value: member.roles.map((roleId) => mention(roleId, MentionTypes.Role)).join(' '),
						inline: false,
					}, {
						name: `${constants.symbols.profile.statistics.statistics} ${strings.statistics}`,
						value:
							`${constants.symbols.profile.statistics.praises} ${strings.praises} • ${strings.received} – ${praisesReceived.size} • ${strings.sent} – ${praisesSent.size}
  ${constants.symbols.profile.statistics.warnings} ${strings.warnings} • ${strings.received} – ${warningsReceived.size}`,
						inline: false,
					}],
				}],
			},
		},
	);
}

export default command;
