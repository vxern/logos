import { Bot, ButtonComponent, ButtonStyles, Interaction, MessageComponentTypes } from "discordeno";
import { EntryStepButtonID } from "../entry.js";
import { proficiency } from "../../../commands/social/roles/categories/language.js";
import { Client, localise } from "../../../client.js";
import { encodeId, reply } from "../../../interactions.js";
import constants from "../../../../constants.js";

async function handleAcceptRules([client, bot]: [Client, Bot], interaction: Interaction, _: string): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) {
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
				language: guild.language,
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
				type: MessageComponentTypes.ActionRow,
				components: proficiency.collection.list.map<ButtonComponent>((proficiencyRole, index) => {
					const strings = {
						name: localise(client, `${proficiencyRole.id}.name`, interaction.locale)(),
					};

					return {
						type: MessageComponentTypes.Button,
						label: strings.name,
						customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.selectedLanguageProficiency, [
							index.toString(),
						]),
						style: ButtonStyles.Secondary,
						emoji: { name: proficiencyRole.emoji },
					};
				}) as [ButtonComponent],
			},
		],
	});
}

export { handleAcceptRules };
