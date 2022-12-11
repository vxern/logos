import {
	ApplicationCommandFlags,
	Bot,
	ButtonComponent,
	ButtonStyles,
	Interaction,
	InteractionResponseTypes,
	MessageComponentTypes,
	sendInteractionResponse,
	User,
} from 'discordeno';
import { Localisations, localise, Services } from 'logos/assets/localisations/mod.ts';
import { getProficiencyCategory } from 'logos/src/commands/social/module.ts';
import { Client } from 'logos/src/client.ts';
import { snowflakeToTimestamp } from 'logos/src/utils.ts';
import configuration from 'logos/configuration.ts';
import { staticComponentIds } from 'logos/constants.ts';

const proficiencyCategory = getProficiencyCategory();
const proficiencies = proficiencyCategory.collection.list;

function handleAcceptRules([client, bot]: [Client, Bot], interaction: Interaction, _parameter: string): void {
	const screening = vetUser(interaction.user);

	if (!screening.canEnter) {
		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: localise(Services.entry.rejected.entryDenied, interaction.locale),
						description: localise(screening.reason!, interaction.locale),
					}],
				},
			},
		);
	}

	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	return void sendInteractionResponse(
		bot,
		interaction.id,
		interaction.token,
		{
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: localise(Services.entry.selectProficiency.header, interaction.locale),
					description: localise(Services.entry.selectProficiency.body, interaction.locale)(guild.language),
				}],
				components: [{
					type: MessageComponentTypes.ActionRow,
					// @ts-ignore: There are only 4 proficiency roles, therefore only 4 buttons. (max is 5)
					components: proficiencies.map<ButtonComponent>(
						(proficiency, index) => ({
							type: MessageComponentTypes.Button,
							label: localise(proficiency.name, interaction.locale),
							customId: `${staticComponentIds.selectedLanguageProficiency}|${index}`,
							style: ButtonStyles.Secondary,
							emoji: { name: proficiency.emoji },
						}),
					),
				}],
			},
		},
	);
}

/** Represents a decision on whether a user may or may not enter the server. */
type VetResult =
	& {
		/** Whether the user can enter the server or not. */
		canEnter: boolean;
	}
	& ({
		canEnter: true;
	} | {
		canEnter: false;

		/** If the user may not enter, the reason for their rejection. */
		reason: Localisations<string>;
	});

/**
 * Taking a user as a parameter, performs checks to determine whether a user
 * may enter the server or not.
 *
 * @param user - The user to screen.
 * @returns A decision in regards to the user being able to join.
 */
function vetUser(user: User): VetResult {
	const createdAt = snowflakeToTimestamp(user.id);

	if ((Date.now() - createdAt) < configuration.services.entry.minimumRequiredAge) {
		return {
			canEnter: false,
			reason: Services.entry.rejected.reasons.accountTooNew,
		};
	}

	return { canEnter: true };
}

export { handleAcceptRules };
