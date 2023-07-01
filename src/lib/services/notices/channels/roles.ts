import constants from "../../../../constants.js";
import { defaultLocale } from "../../../../types.js";
import { Client, localise } from "../../../client.js";
import { getLastUpdateString } from "../notices.js";
import { Bot, ButtonStyles, CreateMessage, Guild, MessageComponentTypes } from "discordeno";

const lastUpdatedAt = new Date(2023, 2, 19);

function generateRoleNotice([client, _]: [Client, Bot], __: Guild): CreateMessage {
	const updateString = getLastUpdateString(client, lastUpdatedAt, defaultLocale);

	const strings = {
		title: localise(client, "roles.selection.title", defaultLocale)(),
		description: {
			usingCommand: localise(
				client,
				"roles.selection.description.usingCommand",
				defaultLocale,
			)({
				command: "`/profile roles`",
			}),
			runAnywhere: localise(client, "roles.selection.description.runAnywhere", defaultLocale)(),
			pressButton: localise(client, "roles.selection.description.pressButton", defaultLocale)(),
			clickHere: localise(client, "roles.selection.description.clickHere", defaultLocale)(),
		},
	};

	return {
		embeds: [
			{
				title: strings.title,
				description: `${updateString}\n\n${strings.description.usingCommand} ${strings.description.runAnywhere}\n\n${strings.description.pressButton}`,
				color: constants.colors.turquoise,
			},
		],
		components: [
			{
				type: MessageComponentTypes.ActionRow,
				components: [
					{
						type: MessageComponentTypes.Button,
						label: strings.description.clickHere,
						style: ButtonStyles.Primary,
						customId: constants.staticComponentIds.selectRoles,
					},
				],
			},
		],
	};
}

export { generateRoleNotice, lastUpdatedAt };
