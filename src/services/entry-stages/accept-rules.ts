import {
	ApplicationCommandFlags,
	Bot,
	ButtonComponent,
	ButtonStyles,
	editOriginalInteractionResponse,
	Interaction,
	InteractionResponseTypes,
	MessageComponentTypes,
	sendInteractionResponse,
} from 'discordeno';
import { localise, Services } from 'logos/assets/localisations/mod.ts';
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { EntryStepButtonID } from 'logos/src/services/entry.ts';
import { Client } from 'logos/src/client.ts';
import { encodeId } from 'logos/src/interactions.ts';
import { snowflakeToTimestamp } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;

async function handleAcceptRules(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	_parameter: string,
): Promise<void> {
	const canEnter = await vetUser([client, bot], interaction);
	if (!canEnter) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				title: localise(Services.entry.selectProficiency.header, interaction.locale),
				description: localise(Services.entry.selectProficiency.body, interaction.locale)(guild.language),
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: proficiencies.map<ButtonComponent>(
					(proficiency, index) => ({
						type: MessageComponentTypes.Button,
						label: localise(proficiency.name, interaction.locale),
						customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.selectedLanguageProficiency, [
							index.toString(),
						]),
						style: ButtonStyles.Secondary,
						emoji: { name: proficiency.emoji },
					}),
				) as [ButtonComponent],
			}],
		},
	);
}

async function vetUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<boolean> {
	await sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Services.entry.verifyingAccount, interaction.locale),
				color: constants.colors.blue,
			}],
		},
	});

	const createdAt = snowflakeToTimestamp(interaction.user.id);

	if ((Date.now() - createdAt) < configuration.services.entry.minimumRequiredAge) {
		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Services.entry.accountTooNew, interaction.locale),
				color: constants.colors.dullYellow,
			}],
		});
		return false;
	}

	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) {
		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Services.entry.failedToVerifyAccount, interaction.locale),
				color: constants.colors.red,
			}],
		});

		client.log.error(
			`Failed to vet user with ID ${interaction.user.id} trying to enter the server due to their user document being returned as undefined.`,
		);

		return false;
	}

	const entryRequest = client.database.adapters.entryRequests.get(client, 'submitterAndGuild', [
		userDocument.ref,
		interaction.guildId!.toString(),
	]);

	if (entryRequest !== undefined && !entryRequest.data.isFinalised) {
		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Services.entry.alreadySubmittedAnswers, interaction.locale),
				color: constants.colors.dullYellow,
			}],
		});
		return false;
	}

	if (userDocument.data.account.authorisedOn?.includes(interaction.guildId!.toString())) return true;
	if (userDocument.data.account.rejectedOn?.includes(interaction.guildId!.toString())) {
		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: localise(Services.entry.entryRequestRejectedPreviously, interaction.locale),
				color: constants.colors.red,
			}],
		});
		return false;
	}

	return true;
}

export { handleAcceptRules };
