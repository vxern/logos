import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from 'discordeno';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import { getLastUpdateString } from 'logos/src/services/notices.ts';
import { getTextChannel } from 'logos/src/utils.ts';
import { mention, MentionTypes } from 'logos/formatting.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

const lastUpdatedAt = new Date(2022, 11, 25);

function generateWelcomeNotice(_: Bot, guild: Guild): CreateMessage {
	const updateString = getLastUpdateString(lastUpdatedAt, defaultLocale);
	const welcomeString = localise(Services.notices.notices.welcome.body, defaultLocale)(
		getChannelMention(guild, configuration.guilds.channels.information),
	);

	return {
		embeds: [{
			title: localise(Services.notices.notices.welcome.header, defaultLocale)(guild.name),
			description: `${updateString}\n\n` + welcomeString,
			color: constants.colors.orange,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				style: ButtonStyles.Secondary,
				label: localise(Services.entry.acceptedRules, defaultLocale),
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
