import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from 'discordeno';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import { getLastUpdateString } from 'logos/src/services/notices.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const lastUpdatedAt = new Date(2023, 1, 1);

async function generateRoleNotice(_bot: Bot, _guild: Guild): Promise<CreateMessage> {
	const updateString = getLastUpdateString(lastUpdatedAt, defaultLocale);

	return {
		embeds: [{
			title: localise(Services.notices.notices.roles.roles.header, defaultLocale),
			description: `${updateString}\n\n` + localise(Services.notices.notices.roles.roles.body, defaultLocale),
			color: constants.colors.turquoise,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				label: localise(Services.notices.notices.roles.clickHereToSelectRoles, defaultLocale),
				style: ButtonStyles.Primary,
				customId: constants.staticComponentIds.selectRoles,
			}],
		}],
	};
}

export { generateRoleNotice, lastUpdatedAt };
