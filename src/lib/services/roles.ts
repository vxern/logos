import { Bot, InteractionTypes } from "discordeno";
import { handleOpenRoleSelectionMenu } from "../commands/social/commands/profile/roles.js";
import { ServiceStarter } from "../services/services.js";
import { Client, isServicing } from "../client.js";
import { createInteractionCollector } from "../interactions.js";
import constants from "../../constants.js";

const service: ServiceStarter = ([client, bot]: [Client, Bot]) => {
	createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		customId: constants.staticComponentIds.selectRoles,
		doesNotExpire: true,
		onCollect: async (_, interaction) => {
			if (!isServicing(client, interaction.guildId!)) {
				return;
			}

			handleOpenRoleSelectionMenu([client, bot], interaction);
		},
	});
};

export default service;
