import type { Client } from "rost/client";
import { CefrGuideView } from "rost/commands/components/tabbed-views/cefr-guide-view";
import { Guild } from "rost/models/guild";

async function handleDisplayCefrGuide(client: Client, interaction: Rost.Interaction): Promise<void> {
	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const component = new CefrGuideView(client, { interaction, guildDocument });

	await component.open();
}

export { handleDisplayCefrGuide };
