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
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { EntryStepButtonID } from 'logos/src/services/entry.ts';
import { Client, localise } from 'logos/src/client.ts';
import { encodeId } from 'logos/src/interactions.ts';
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

	const requestedRole = guild.roles.array().find((role) =>
		role.name === localise(client, `${proficiency.id}.name`, defaultLocale)()
	);
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
			const needToVerifyString = localise(client, 'entry.verification.needToVerify', interaction.locale)({
				'guild_name': guild.name,
			});
			const answerHonestlyString = localise(client, 'entry.verification.answerHonestly', interaction.locale)();

			return void sendInteractionResponse(bot, interaction.id, interaction.token, {
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						description: `${needToVerifyString}\n\n${answerHonestlyString}`,
						color: constants.colors.blue,
					}],
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.Button,
							style: ButtonStyles.Secondary,
							label: localise(client, 'entry.verification.iUnderstand', interaction.locale)(),
							customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.requestedVerification, [
								requestedRole.id.toString(),
							]),
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
