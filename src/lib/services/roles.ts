import constants from "../../constants.js";
import { Client, isServicing } from "../client.js";
import { handleOpenRoleSelectionMenu } from "../commands/social/commands/profile/roles.js";
import { createInteractionCollector } from "../interactions.js";
import { ServiceStarter } from "../services/services.js";
import { Bot, InteractionTypes } from "discordeno";

const service: ServiceStarter = ([client, bot]: [Client, Bot]) => {
	createInteractionCollector([client, bot], {
		type: InteractionTypes.MessageComponent,
		customId: constants.staticComponentIds.selectRoles,
		doesNotExpire: true,
		onCollect: async (_, interaction) => {
			const guildId = interaction.guildId;
			if (guildId === undefined) {
				return undefined;
			}

			if (!isServicing(client, guildId)) {
				return;
			}

			handleOpenRoleSelectionMenu([client, bot], interaction);
		},
	});
};

export default service;
