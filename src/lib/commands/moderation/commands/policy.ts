import { Locale } from "../../../../constants/languages";
import * as Logos from "../../../../types";
import { Client, localise } from "../../../client";
import { parseArguments, reply } from "../../../interactions";
import { CommandTemplate } from "../../command";
import { show } from "../../parameters";
import * as Discord from "discordeno";

const command: CommandTemplate = {
	name: "policy",
	type: Discord.ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ["VIEW_CHANNEL"],
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

	const guildDocument = await client.database.adapters.guilds.getOrFetchOrCreate(
		client,
		"id",
		guildId.toString(),
		guildId,
	);
	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.data.features.moderation.features?.policy;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const strings = {
		title: localise(client, "policies.moderation.title", locale)(),
	};

	reply(
		[client, bot],
		interaction,
		{ embeds: [{ title: strings.title, fields: getModerationPolicyPoints(client, { locale }) }] },
		{ visible: show },
	);
}

function getModerationPolicyPoints(
	client: Client,
	{ locale }: { locale: Locale },
): NonNullable<Discord.Embed["fields"]> {
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
