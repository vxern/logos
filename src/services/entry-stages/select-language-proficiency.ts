import {
	addRole,
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	Interaction,
	InteractionResponseTypes,
	MessageComponentTypes,
	sendInteractionResponse,
} from 'discordeno';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { Client } from 'logos/src/client.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;

async function handleSelectLanguageProficiency(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const proficiency = proficiencies[parseInt(parameter)]!;

	const requestedRole = guild.roles.array().find((role) => role.name === localise(proficiency.name, defaultLocale));
	if (requestedRole === undefined) return;

	const requiresVerification = !configuration.services.entry.verification.disabledOn.includes(guild.language);
	if (requiresVerification) {
		const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
			client,
			'id',
			interaction.user.id.toString(),
			interaction.user.id,
		);

		const isVerified = !userDocument?.data.account.authorisedOn?.includes(interaction.guildId!.toString());

		if (isVerified) {
			return void sendInteractionResponse(bot, interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: localise(Services.entry.needsVerification, interaction.locale)(guild.name),
						color: constants.colors.blue,
					}],
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.Button,
							style: ButtonStyles.Secondary,
							label: localise(Services.entry.iUnderstand, interaction.locale),
							customId: `${constants.staticComponentIds.requestedVerification}|${requestedRole.id}`,
							emoji: { name: constants.symbols.understood },
						}],
					}],
				},
			});
		} else {
			sendInteractionResponse(bot, interaction.id, interaction.token, {
				type: InteractionResponseTypes.DeferredUpdateMessage,
			});
		}
	}

	return void addRole(bot, guild.id, interaction.user.id, requestedRole.id, 'User-requested role addition.');
}

export { handleSelectLanguageProficiency };
