import { Bot, InteractionTypes } from 'discordeno';
import { handleOpenRoleSelectionMenu } from 'logos/src/commands/social/commands/profile/roles.ts';
import { ServiceStarter } from 'logos/src/services/services.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';

const service: ServiceStarter = ([client, bot]: [Client, Bot]) => {
	createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		customId: constants.staticComponentIds.selectRoles,
		doesNotExpire: true,
		onCollect: (_, interaction) => handleOpenRoleSelectionMenu([client, bot], interaction),
	});
};

export default service;
