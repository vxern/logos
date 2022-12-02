import {
	addRole,
	Bot,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from 'discordeno';
import { localise } from 'logos/assets/localisations/mod.ts';
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { Client } from 'logos/src/client.ts';
import { defaultLocale } from 'logos/types.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;

function onSelectLanguageProficiency(
	[client, bot]: [Client, Bot],
	interaction: Interaction & { type: InteractionTypes.MessageComponent },
	parameter: string,
): void {
	sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{ type: InteractionResponseTypes.DeferredUpdateMessage },
	);

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const proficiency = proficiencies[parseInt(parameter)]!;

	const roleResolved = guild.roles.array().find((role) => role.name === localise(proficiency.name, defaultLocale));
	if (roleResolved === undefined) return;

	return void addRole(
		bot,
		guild.id,
		interaction.user.id,
		roleResolved.id,
		'User-requested role addition.',
	);
}

export { onSelectLanguageProficiency };
