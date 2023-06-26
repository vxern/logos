import { addRole, Bot, ButtonStyles, Interaction, MessageComponentTypes } from 'discordeno';
import { proficiency } from 'logos/src/lib/commands/social/roles/categories/language.ts';
import { EntryStepButtonID } from 'logos/src/lib/services/entry/entry.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { encodeId, reply } from 'logos/src/lib/interactions.ts';
import { snowflakeToTimestamp } from 'logos/src/lib/utils.ts';
import configuration from 'logos/src/configuration.ts';
import constants from 'logos/src/constants.ts';

async function handleSelectLanguageProficiency(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	parameter: string,
): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const guildIdString = guild.id.toString();

	const roleId = BigInt(proficiency.collection.list[parseInt(parameter)]!.snowflakes[guildIdString]!);
	const role = guild.roles.get(roleId);
	if (role === undefined) return;

	const canEnter = await vetUser([client, bot], interaction);
	if (!canEnter) return;

	const createdAt = snowflakeToTimestamp(interaction.user.id);
	const meetsAccountAgeRequirement = (Date.now() - createdAt) >= configuration.services.entry.minimumRequiredAge;

	const requiresVerification = !configuration.services.entry.verification.disabledOn.includes(guildIdString) &&
		!meetsAccountAgeRequirement;
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

async function vetUser([client, bot]: [Client, Bot], interaction: Interaction): Promise<boolean> {
	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) {
		const strings = {
			title: localise(client, 'entry.verification.verifyingAccount.failed.title', interaction.locale)(),
			description: localise(client, 'entry.verification.verifyingAccount.failed.description', interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
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
			title: localise(client, 'entry.verification.answers.alreadyAnswered.title', interaction.locale)(),
			description: localise(client, 'entry.verification.answers.alreadyAnswered.description', interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.dullYellow,
			}],
		});

		return false;
	}

	if (userDocument.data.account.authorisedOn?.includes(interaction.guildId!.toString())) return true;
	if (userDocument.data.account.rejectedOn?.includes(interaction.guildId!.toString())) {
		const strings = {
			title: localise(client, 'entry.verification.answers.rejectedBefore.title', interaction.locale)(),
			description: localise(client, 'entry.verification.answers.rejectedBefore.description', interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [{
				title: strings.title,
				description: strings.description,
				color: constants.colors.red,
			}],
		});

		return false;
	}

	return true;
}

export { handleSelectLanguageProficiency };
