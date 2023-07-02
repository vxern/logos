import constants from "../../../../constants.js";
import { Client, localise } from "../../../client.js";
import { proficiency } from "../../../commands/social/roles/categories/language.js";
import { encodeId, reply } from "../../../interactions.js";
import { EntryStepButtonID } from "../entry.js";
import * as Discord from "discordeno";

async function handleAcceptRules(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	_: string,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await client.database.adapters.guilds.getOrFetch(client, "id", guildId.toString());
	if (guildDocument === undefined) {
		return;
	}

	const strings = {
		title: localise(client, "entry.proficiency.title", interaction.locale)(),
		description: {
			chooseProficiency: localise(
				client,
				"entry.proficiency.description.chooseProficiency",
				interaction.locale,
			)({
				language: guildDocument.data.language,
			}),
			canChangeLater: localise(
				client,
				"entry.proficiency.description.canChangeLater",
				interaction.locale,
			)({
				command: "`/profile roles`",
			}),
		},
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: `${strings.description.chooseProficiency}\n\n${strings.description.canChangeLater}`,
			},
		],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: proficiency.collection.list.map<Discord.ButtonComponent>((proficiencyRole, index) => {
					const strings = {
						name: localise(client, `${proficiencyRole.id}.name`, interaction.locale)(),
					};

					return {
						type: Discord.MessageComponentTypes.Button,
						label: strings.name,
						customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.entry.selectedLanguageProficiency, [
							index.toString(),
						]),
						style: Discord.ButtonStyles.Secondary,
						emoji: { name: proficiencyRole.emoji },
					};
				}) as [Discord.ButtonComponent],
			},
		],
	});
}

export { handleAcceptRules };
