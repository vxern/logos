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
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { EntryStepButtonID } from 'logos/src/services/entry.ts';
import { Client, localise } from 'logos/src/client.ts';
import { encodeId } from 'logos/src/interactions.ts';
import { snowflakeToTimestamp } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencyRoles = proficiencyCategory.collection.list;

async function handleAcceptRules(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	_parameter: string,
): Promise<void> {
	const canEnter = await vetUser([client, bot], interaction);
	if (!canEnter) return;

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const strings = {
		title: localise(client, 'entry.proficiencySelection.proficiency', interaction.locale)(),
		description: {
			chooseProficiency: localise(client, 'entry.proficiencySelection.chooseProficiency', interaction.locale)({
				'language': guild.language,
			}),
			canChangeRolesLater: localise(client, 'entry.proficiencySelection.canChangeRolesLater', interaction.locale)({
				'command': '`/profile roles`',
			}),
		},
	};

	return void editOriginalInteractionResponse(
		bot,
		interaction.token,
		{
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				title: strings.title,
				description: `${strings.description.chooseProficiency}\n\n${strings.description.canChangeRolesLater}`,
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: proficiencyRoles.map<ButtonComponent>(
					(proficiencyRole, index) => {
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
					},
				) as [ButtonComponent],
			}],
		},
	);
}

async function vetUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<boolean> {
	const strings = {
		verifyingAccount: localise(client, 'entry.verification.verifyingAccount', interaction.locale)(),
	};

	await sendInteractionResponse(bot, interaction.id, interaction.token, {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: strings.verifyingAccount,
				color: constants.colors.blue,
			}],
		},
	});

	const createdAt = snowflakeToTimestamp(interaction.user.id);

	if ((Date.now() - createdAt) < configuration.services.entry.minimumRequiredAge) {
		const strings = {
			accountTooNew: localise(client, 'entry.verification.accountTooNew', interaction.locale)(),
		};

		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: strings.accountTooNew,
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
		const strings = {
			failedToVerifyAccount: localise(client, 'entry.verification.failedToVerifyAccount', interaction.locale)(),
		};

		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: strings.failedToVerifyAccount,
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
		const strings = {
			alreadySubmittedAnswers: localise(client, 'entry.verification.alreadySubmittedAnswers', interaction.locale)(),
		};

		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: strings.alreadySubmittedAnswers,
				color: constants.colors.dullYellow,
			}],
		});
		return false;
	}

	if (userDocument.data.account.authorisedOn?.includes(interaction.guildId!.toString())) return true;
	if (userDocument.data.account.rejectedOn?.includes(interaction.guildId!.toString())) {
		const strings = {
			entryRequestRejectedPreviously: localise(
				client,
				'entry.verification.entryRequestRejectedPreviously',
				interaction.locale,
			)(),
		};

		editOriginalInteractionResponse(bot, interaction.token, {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				description: strings.entryRequestRejectedPreviously,
				color: constants.colors.red,
			}],
		});
		return false;
	}

	return true;
}

export { handleAcceptRules };
