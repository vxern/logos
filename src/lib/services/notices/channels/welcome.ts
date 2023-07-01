import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { getChannelMention } from "../../../utils.js";
import { getLastUpdateString } from "../notices.js";
import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from "discordeno";

const lastUpdatedAt = new Date(2023, 3, 24);

function generateWelcomeNotice([client, _]: [Client, Bot], guild: Guild): CreateMessage {
	const updateString = getLastUpdateString(client, lastUpdatedAt, defaultLocale);

	const strings = {
		title: localise(client, "entry.welcome.title", defaultLocale)({ server_name: guild.name }),
		description: {
			toEnter: localise(
				client,
				"entry.welcome.description.toEnter",
				defaultLocale,
			)({ information_channel_mention: getChannelMention(guild, configuration.guilds.channels.information) }),
			acceptedRules: localise(client, "entry.welcome.description.acceptedRules", defaultLocale)(),
		},
	};

	return {
		embeds: [
			{
				title: strings.title,
				description: `${updateString}\n\n${strings.description.toEnter}`,
				image: { url: constants.gifs.followRules },
				color: constants.colors.orange,
			},
		],
		components: [
			{
				type: MessageComponentTypes.ActionRow,
				components: [
					{
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Secondary,
						label: strings.description.acceptedRules,
						customId: constants.staticComponentIds.entry.acceptedRules,
						emoji: { name: constants.symbols.understood },
					},
				],
			},
		],
	};
}

export { generateWelcomeNotice, lastUpdatedAt };
