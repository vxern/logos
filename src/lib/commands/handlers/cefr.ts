import { Client } from "logos/client";
import { CefrGuideView } from "logos/commands/components/tabbed-views/cefr-guide-view";
import { Guild } from "logos/database/guild";

async function handleDisplayCefrGuide(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guildDocument = await Guild.getOrCreate(client, { guildId: guildId.toString() });

	const component = new CefrGuideView(client, { interaction, showable: !interaction.parameters.show, guildDocument });

	await component.open();
}

export { handleDisplayCefrGuide };
