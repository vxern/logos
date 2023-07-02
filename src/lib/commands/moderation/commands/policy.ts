import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { parseArguments, reply } from "../../../interactions.js";
import { CommandTemplate } from "../../command.js";
import { show } from "../../parameters.js";
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
	interaction: Discord.Interaction,
): Promise<void> {
	const [{ show }] = parseArguments(interaction.data?.options, { show: "boolean" });

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const locale = show ? defaultLocale : interaction.locale;

	const strings = {
		title: localise(client, "policies.moderation.title", interaction.locale)(),
	};

	reply(
		[client, bot],
		interaction,
		{ embeds: [{ title: strings.title, fields: getModerationPolicyPoints(client, locale) }] },
		{ visible: show },
	);
}

function getModerationPolicyPoints(client: Client, locale: string | undefined): NonNullable<Discord.Embed["fields"]> {
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
