import {
	addRole,
	Bot,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../deps.ts';
import { localise } from '../../../../assets/localisations/types.ts';
import { Client } from '../../../client.ts';
import { getProficiencyCategory } from '../../../commands/social/module.ts';
import { defaultLanguage } from '../../../types.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;

async function onSelectLanguageProficiency(
	[client, bot]: [Client, Bot],
	interaction: Interaction & { type: InteractionTypes.MessageComponent },
	parameter: string,
): Promise<void> {
	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{ type: InteractionResponseTypes.DeferredUpdateMessage },
	);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const proficiency = proficiencies[parseInt(parameter)]!;

	const roleResolved = guild.roles.array().find((role) => role.name === localise(proficiency.name, defaultLanguage));
	if (!roleResolved) return;

	return void addRole(
		bot,
		guild.id,
		interaction.user.id,
		roleResolved.id,
		'User-requested role addition.',
	);
}

export { onSelectLanguageProficiency };
