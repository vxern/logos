import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from 'discordeno';
import { getLastUpdateString } from 'logos/src/services/notices.ts';
import { Client, localise } from 'logos/src/client.ts';
import { getTextChannel } from 'logos/src/utils.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

const lastUpdatedAt = new Date(2023, 2, 19);

function generateWelcomeNotice([client, _]: [Client, Bot], guild: Guild): CreateMessage {
	const updateString = getLastUpdateString(client, lastUpdatedAt, defaultLocale);
	const welcomeString = localise(client, 'entry.welcome.toEnter', defaultLocale)(
		{ 'information_channel_mention': getChannelMention(guild, configuration.guilds.channels.information) },
	);

	return {
		embeds: [{
			title: localise(client, 'entry.welcome.welcome', defaultLocale)({ 'guild_name': guild.name }),
			description: `${updateString}\n\n${welcomeString}`,
			color: constants.colors.orange,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Secondary,
				label: localise(client, 'entry.welcome.acceptedRules', defaultLocale)(),
				customId: constants.staticComponentIds.acceptedRules,
				emoji: { name: constants.symbols.understood },
			}],
		}],
	};
}

function getChannelMention(guild: Guild, name: string): string {
	const channel = getTextChannel(guild, name);
	if (channel === undefined) return name;

	return mention(channel.id, MentionTypes.Channel);
}

export { generateWelcomeNotice, lastUpdatedAt };
