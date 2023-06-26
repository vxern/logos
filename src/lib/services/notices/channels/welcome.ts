import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from 'discordeno';
import { getLastUpdateString } from 'logos/src/lib/services/notices/notices.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { getChannelMention } from 'logos/src/lib/utils.ts';
import { defaultLocale } from 'logos/src/types.ts';
import configuration from 'logos/src/configuration.ts';
import constants from 'logos/src/constants.ts';

const lastUpdatedAt = new Date(2023, 3, 24);

function generateWelcomeNotice([client, _]: [Client, Bot], guild: Guild): CreateMessage {
	const updateString = getLastUpdateString(client, lastUpdatedAt, defaultLocale);

	const strings = {
		title: localise(client, 'entry.welcome.title', defaultLocale)({ 'server_name': guild.name }),
		description: {
			toEnter: localise(client, 'entry.welcome.description.toEnter', defaultLocale)(
				{ 'information_channel_mention': getChannelMention(guild, configuration.guilds.channels.information) },
			),
			acceptedRules: localise(client, 'entry.welcome.description.acceptedRules', defaultLocale)(),
		},
	};

	return {
		embeds: [{
			title: strings.title,
			description: `${updateString}\n\n${strings.description.toEnter}`,
			image: { url: constants.gifs.followRules },
			color: constants.colors.orange,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Secondary,
				label: strings.description.acceptedRules,
				customId: constants.staticComponentIds.acceptedRules,
				emoji: { name: constants.symbols.understood },
			}],
		}],
	};
}

export { generateWelcomeNotice, lastUpdatedAt };
