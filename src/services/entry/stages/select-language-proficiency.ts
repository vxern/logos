import {
	addRole,
	ApplicationCommandFlags,
	Bot,
	ButtonStyles,
	deleteMessage,
	Guild,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	sendInteractionResponse,
	sendMessage,
	TextStyles,
} from 'discordeno';
import { localise, Modals, Services } from 'logos/assets/localisations/mod.ts';
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { log } from 'logos/src/controllers/logging/logging.ts';
import { Client, WithLanguage } from 'logos/src/client.ts';
import { createInteractionCollector, createModalComposer } from 'logos/src/interactions.ts';
import { diagnosticMentionUser, getTextChannel } from 'logos/src/utils.ts';
import { defaultLocale } from 'logos/types.ts';
import configuration from 'logos/configuration.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;

async function handleSelectLanguageProficiency(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const requiresVerification = !configuration.services.entry.verification.disabledOn.includes(guild.language);
	if (requiresVerification) {
		const isVerified = await verifyUser([client, bot], interaction, guild);

		if (!isVerified) return;
	}

	const proficiency = proficiencies[parseInt(parameter)]!;

	const roleResolved = guild.roles.array().find((role) => role.name === localise(proficiency.name, defaultLocale));
	if (roleResolved === undefined) return;

	return void addRole(bot, guild.id, interaction.user.id, roleResolved.id, 'User-requested role addition.');
}

/**
 * Taking a user as a parameter, opens a verification prompt and waits for one
 * of the guides to accept or reject the entry request.
 */
function verifyUser(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	guild: WithLanguage<Guild>,
): Promise<boolean> {
	return new Promise((resolve) => {
		createModalComposer([client, bot], interaction, {
			modal: {
				title: localise(Modals.verification.title, interaction.locale),
				fields: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						customId: 'reason',
						type: MessageComponentTypes.InputText,
						label: localise(Modals.verification.fields.reason, interaction.locale)(guild.language),
						style: TextStyles.Paragraph,
						required: true,
						minLength: 20,
						maxLength: 300,
					}],
				}, {
					type: MessageComponentTypes.ActionRow,
					components: [{
						customId: 'aim',
						type: MessageComponentTypes.InputText,
						label: localise(Modals.verification.fields.aim, interaction.locale),
						style: TextStyles.Paragraph,
						required: true,
						minLength: 20,
						maxLength: 300,
					}],
				}, {
					type: MessageComponentTypes.ActionRow,
					components: [{
						customId: 'where_found',
						type: MessageComponentTypes.InputText,
						label: localise(Modals.verification.fields.whereFound, interaction.locale)(guild.name),
						style: TextStyles.Short,
						required: true,
						minLength: 5,
						maxLength: 50,
					}],
				}],
			},
			onSubmit: async (submission, content) => {
				sendInteractionResponse(bot, submission.id, submission.token, {
					type: InteractionResponseTypes.ChannelMessageWithSource,
					data: {
						flags: ApplicationCommandFlags.Ephemeral,
						embeds: [{
							title: localise(Services.entry.verification.answersSubmitted.header, interaction.locale),
							description: localise(Services.entry.verification.answersSubmitted.body, interaction.locale),
							color: configuration.messages.colors.green,
						}],
					},
				});

				const verificationChannel = getTextChannel(guild, configuration.guilds.channels.verification)!;

				const decisionPromptId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					doesNotExpire: true,
					limit: 1,
					onCollect: (bot, selection) => {
						const customId = selection.data?.customId;
						if (!customId) return;

						const customIdParts = customId.split('|');
						if (customIdParts.length !== 2) return;

						const [_customId, isAcceptedString] = customIdParts;
						const isAccepted = isAcceptedString === 'true';

						log(
							[client, bot],
							guild,
							isAccepted ? 'verificationRequestAccept' : 'verificationRequestReject',
							interaction.user,
							selection.member!,
						);

						deleteMessage(bot, verificationChannel.id, decisionPromptMessageId);

						return resolve(isAccepted);
					},
				});

				const decisionPromptMessageId = await sendMessage(bot, verificationChannel.id, {
					embeds: [{
						title: diagnosticMentionUser(interaction.user),
						fields: [{
							name: localise(Modals.verification.fields.reason, defaultLocale)(guild.language),
							value: content.reason!,
						}, {
							name: localise(Modals.verification.fields.aim, defaultLocale),
							value: content.aim!,
						}, {
							name: localise(Modals.verification.fields.whereFound, defaultLocale)(guild.name),
							value: content.where_found!,
						}],
					}],
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.Button,
							style: ButtonStyles.Success,
							label: localise(Services.entry.verification.accept, defaultLocale),
							customId: `${decisionPromptId}|true`,
						}, {
							type: MessageComponentTypes.Button,
							style: ButtonStyles.Danger,
							label: localise(Services.entry.verification.dismiss, defaultLocale),
							customId: `${decisionPromptId}|false`,
						}],
					}],
				}).then((message) => message.id);

				return true;
			},
			onInvalid: () => new Promise((resolve) => resolve(undefined)),
		});
	});
}

export { handleSelectLanguageProficiency };
