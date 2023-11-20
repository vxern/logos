import * as Discord from "@discordeno/bot";
import { Locale } from "../../../../constants/languages";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { getShowButton, parseArguments, reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import { Guild } from "../../../database/guild";

const command: CommandTemplate = {
	name: "policy",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
	isShowable: true,
	handle: handleDisplayModerationPolicy,
	options: [show],
};

async function handleDisplayModerationPolicy(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.moderation.features?.policy;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const show = interaction.show ?? showParameter ?? false;

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const strings = {
		title: localise(client, "policies.moderation.title", locale)(),
	};

	const showButton = getShowButton(client, interaction, { locale });

	const components: Discord.ActionRow[] | undefined = show
		? undefined
		: [{ type: Discord.MessageComponentTypes.ActionRow, components: [showButton] }];

	reply(
		[client, bot],
		interaction,
		{ embeds: [{ title: strings.title, fields: getModerationPolicyPoints(client, { locale }) }], components },
		{ visible: show },
	);
}

function getModerationPolicyPoints(
	client: Client,
	{ locale }: { locale: Locale },
): Discord.CamelizedDiscordEmbedField[] {
	const strings = {
		introduction: {
			title: localise(client, "policies.moderation.points.introduction.title", locale)(),
			description: localise(client, "policies.moderation.points.introduction.description", locale)(),
		},
		breach: {
			title: localise(client, "policies.moderation.points.breach.title", locale)(),
			description: localise(client, "policies.moderation.points.breach.description", locale)(),
		},
		warnings: {
			title: localise(client, "policies.moderation.points.warnings.title", locale)(),
			description: localise(client, "policies.moderation.points.warnings.description", locale)(),
		},
		furtherAction: {
			title: localise(client, "policies.moderation.points.furtherAction.title", locale)(),
			description: localise(client, "policies.moderation.points.furtherAction.description", locale)(),
		},
		ban: {
			title: localise(client, "policies.moderation.points.ban.title", locale)(),
			description: localise(client, "policies.moderation.points.ban.description", locale)(),
		},
	};

	return [
		{
			name: strings.introduction.title,
			value: strings.introduction.description,
		},
		{
			name: strings.breach.title,
			value: strings.breach.description,
		},
		{
			name: strings.warnings.title,
			value: strings.warnings.description,
		},
		{
			name: strings.furtherAction.title,
			value: strings.furtherAction.description,
		},
		{
			name: strings.ban.title,
			value: strings.ban.description,
		},
	];
}

export default command;
