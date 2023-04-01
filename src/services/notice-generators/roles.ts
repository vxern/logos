import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from 'discordeno';
import { getLastUpdateString } from 'logos/src/services/notices.ts';
import { Client, localise } from 'logos/src/client.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const lastUpdatedAt = new Date(2023, 2, 19);

async function generateRoleNotice([client, _]: [Client, Bot], __: Guild): Promise<CreateMessage> {
	const updateString = getLastUpdateString(client, lastUpdatedAt, defaultLocale);

	const strings = {
		title: localise(client, 'roles.howToPickRoles', defaultLocale)(),
		selectRolesUsingCommand: localise(client, 'roles.selectRolesUsingCommand', defaultLocale)({
			'command': '`/profile roles`',
		}),
		commandRunnableAnywhere: localise(client, 'roles.commandRunnableAnywhere', defaultLocale)(),
		pressButtonToOpenMenu: localise(client, 'roles.pressButtonToOpenMenu', defaultLocale)(),
		clickHereToSelectRoles: localise(client, 'roles.clickHereToSelectRoles', defaultLocale)(),
	};

	return {
		embeds: [{
			title: strings.title,
			description:
				`${updateString}\n\n${strings.selectRolesUsingCommand} ${strings.commandRunnableAnywhere}\n\n${strings.pressButtonToOpenMenu}`,
			color: constants.colors.turquoise,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				label: strings.clickHereToSelectRoles,
				style: ButtonStyles.Primary,
				customId: constants.staticComponentIds.selectRoles,
			}],
		}],
	};
}

export { generateRoleNotice, lastUpdatedAt };
