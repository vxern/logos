import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from 'discordeno';
import { getLastUpdateString } from 'logos/src/services/notices.ts';
import { Client, localise } from 'logos/src/client.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

const lastUpdatedAt = new Date(2023, 2, 19);

async function generateRoleNotice([client, _]: [Client, Bot], __: Guild): Promise<CreateMessage> {
	const updateString = getLastUpdateString(client, lastUpdatedAt, defaultLocale);
	const selectRolesUsingCommandString = localise(client, 'roles.selectRolesUsingCommand', defaultLocale)({
		'command': '`/profile roles`',
	});
	const commandRunnableAnywhereString = localise(client, 'roles.commandRunnableAnywhere', defaultLocale)();
	const pressButtonToOpenMenu = localise(client, 'roles.commandRunnableAnywhere', defaultLocale)();

	return {
		embeds: [{
			title: localise(client, 'roles.howToPickRoles', defaultLocale)(),
			description:
				`${updateString}\n\n${selectRolesUsingCommandString} ${commandRunnableAnywhereString}\n\n${pressButtonToOpenMenu}`,
			color: constants.colors.turquoise,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.Button,
				label: localise(client, 'roles.clickHereToSelectRoles', defaultLocale)(),
				style: ButtonStyles.Primary,
				customId: constants.staticComponentIds.selectRoles,
			}],
		}],
	};
}

export { generateRoleNotice, lastUpdatedAt };
