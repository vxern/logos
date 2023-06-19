import { addRole, Bot, ButtonStyles, Interaction, MessageComponentTypes } from 'discordeno';
import { proficiency } from 'logos/src/commands/social/roles/categories/language.ts';
import { EntryStepButtonID } from 'logos/src/services/entry.ts';
import { Client, localise } from 'logos/src/client.ts';
import { encodeId, reply } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import constants from 'logos/constants.ts';
import { defaultLocale } from 'logos/types.ts';

async function handleSelectLanguageProficiency(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const roleId = proficiency.collection.list[parseInt(parameter)]!;
	const role = guild.roles.array().find((role) => {
		const strings = {
			name: localise(client, `${roleId}.name`, defaultLocale)(),
		};

		return role.name === strings.name;
	});
	if (role === undefined) return;

	const requiresVerification = !configuration.services.entry.verification.disabledOn.includes(guild.id.toString());
	if (requiresVerification) {
		const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
			client,
			'id',
			interaction.user.id.toString(),
			interaction.user.id,
		);

		const isVerified = userDocument?.data.account.authorisedOn?.includes(interaction.guildId!.toString());

		if (!isVerified) {
			const strings = {
				title: localise(client, 'entry.verification.getVerified.title', interaction.locale)(),
				description: {
					verificationRequired: localise(
						client,
						'entry.verification.getVerified.description.verificationRequired',
						interaction.locale,
					)({
						'server_name': guild.name,
					}),
					honestAnswers: localise(
						client,
						'entry.verification.getVerified.description.honestAnswers',
						interaction.locale,
					)(),
					understood: localise(client, 'entry.verification.getVerified.description.understood', interaction.locale)(),
				},
			};

			return void reply([client, bot], interaction, {
				embeds: [{
					title: strings.title,
					description: `${strings.description.verificationRequired}\n\n${strings.description.honestAnswers}`,
					color: constants.colors.blue,
				}],
				components: [{
					type: MessageComponentTypes.ActionRow,
					components: [{
						type: MessageComponentTypes.Button,
						style: ButtonStyles.Secondary,
						label: strings.description.understood,
						customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.requestedVerification, [
							role.id.toString(),
						]),
						emoji: { name: constants.symbols.understood },
					}],
				}],
			});
		}
	}

	const strings = {
		title: localise(client, 'entry.proficiency.receivedAccess.title', interaction.locale)(),
		description: {
			nowMember: localise(client, 'entry.proficiency.receivedAccess.description.nowMember', interaction.locale)({
				'server_name': guild.name,
			}),
			toStart: localise(client, 'entry.proficiency.receivedAccess.description.toStart', interaction.locale)(),
		},
	};

	await reply([client, bot], interaction, {
		embeds: [{
			title: strings.title,
			description:
				`${constants.symbols.responses.celebration} ${strings.description.nowMember}\n\n${strings.description.toStart}`,
			image: { url: constants.gifs.welcome },
			color: constants.colors.lightGreen,
		}],
	});

	return void addRole(bot, guild.id, interaction.user.id, role.id, 'User-requested role addition.').catch(() =>
		client.log.warn(
			`Failed to add role with ID ${role.id} to member with ID ${interaction.user.id} in guild with ID ${guild.id}.`,
		)
	);
}

export { handleSelectLanguageProficiency };
