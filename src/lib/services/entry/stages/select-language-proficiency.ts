import configuration from "../../../../configuration.js";
import constants from "../../../../constants.js";
import { Client, localise } from "../../../client.js";
import { proficiency } from "../../../commands/social/roles/categories/language.js";
import { encodeId, reply } from "../../../interactions.js";
import { EntryStepButtonID } from "../../../services/entry/entry.js";
import { snowflakeToTimestamp } from "../../../utils.js";
import * as Discord from "discordeno";

async function handleSelectLanguageProficiency(
	[client, bot]: [Client, Discord.Bot],
	interaction: Discord.Interaction,
	parameter: string,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.cache.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const guildIdString = guild.id.toString();

	const snowflake = proficiency.collection.list[parseInt(parameter)]?.snowflakes[guildIdString];
	if (snowflake === undefined) {
		return;
	}

	const roleId = BigInt(snowflake);
	const role = guild.roles.get(roleId);
	if (role === undefined) {
		return;
	}

	const canEnter = await vetUser([client, bot], interaction);
	if (!canEnter) {
		return;
	}

	const createdAt = snowflakeToTimestamp(interaction.user.id);
	const meetsAccountAgeRequirement = Date.now() - createdAt >= configuration.services.entry.minimumRequiredAge;

	const requiresVerification = !(
		configuration.services.entry.verification.disabledOn.includes(guildIdString) || meetsAccountAgeRequirement
	);
	if (requiresVerification) {
		const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
			client,
			"id",
			interaction.user.id.toString(),
			interaction.user.id,
		);

		const isVerified = userDocument?.data.account.authorisedOn?.includes(guildId.toString());

		if (!isVerified) {
			const strings = {
				title: localise(client, "entry.verification.getVerified.title", interaction.locale)(),
				description: {
					verificationRequired: localise(
						client,
						"entry.verification.getVerified.description.verificationRequired",
						interaction.locale,
					)({
						server_name: guild.name,
					}),
					honestAnswers: localise(
						client,
						"entry.verification.getVerified.description.honestAnswers",
						interaction.locale,
					)(),
					understood: localise(client, "entry.verification.getVerified.description.understood", interaction.locale)(),
				},
			};

			reply([client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: `${strings.description.verificationRequired}\n\n${strings.description.honestAnswers}`,
						color: constants.colors.blue,
					},
				],
				components: [
					{
						type: Discord.MessageComponentTypes.ActionRow,
						components: [
							{
								type: Discord.MessageComponentTypes.Button,
								style: Discord.ButtonStyles.Secondary,
								label: strings.description.understood,
								customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.entry.requestedVerification, [
									role.id.toString(),
								]),
								emoji: { name: constants.symbols.understood },
							},
						],
					},
				],
			});
			return;
		}
	}

	const strings = {
		title: localise(client, "entry.proficiency.receivedAccess.title", interaction.locale)(),
		description: {
			nowMember: localise(
				client,
				"entry.proficiency.receivedAccess.description.nowMember",
				interaction.locale,
			)({
				server_name: guild.name,
			}),
			toStart: localise(client, "entry.proficiency.receivedAccess.description.toStart", interaction.locale)(),
		},
	};

	await reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: `${constants.symbols.responses.celebration} ${strings.description.nowMember}\n\n${strings.description.toStart}`,
				image: { url: constants.gifs.welcome },
				color: constants.colors.lightGreen,
			},
		],
	});

	Discord.addRole(bot, guild.id, interaction.user.id, role.id, "User-requested role addition.").catch(() =>
		client.log.warn(
			`Failed to add role with ID ${role.id} to member with ID ${interaction.user.id} in guild with ID ${guild.id}.`,
		),
	);
}

async function vetUser([client, bot]: [Client, Discord.Bot], interaction: Discord.Interaction): Promise<boolean> {
	const userDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		"id",
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (userDocument === undefined) {
		const strings = {
			title: localise(client, "entry.verification.verifyingAccount.failed.title", interaction.locale)(),
			description: localise(client, "entry.verification.verifyingAccount.failed.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});

		client.log.error(
			`Failed to vet user with ID ${interaction.user.id} trying to enter the server due to their user document being returned as undefined.`,
		);

		return false;
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return false;
	}

	const entryRequest = client.database.adapters.entryRequests.get(client, "submitterAndGuild", [
		userDocument.ref,
		guildId.toString(),
	]);

	if (entryRequest !== undefined && !entryRequest.data.isFinalised) {
		const strings = {
			title: localise(client, "entry.verification.answers.alreadyAnswered.title", interaction.locale)(),
			description: localise(client, "entry.verification.answers.alreadyAnswered.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				},
			],
		});

		return false;
	}

	if (userDocument.data.account.authorisedOn?.includes(guildId.toString())) {
		return true;
	}
	if (userDocument.data.account.rejectedOn?.includes(guildId.toString())) {
		const strings = {
			title: localise(client, "entry.verification.answers.rejectedBefore.title", interaction.locale)(),
			description: localise(client, "entry.verification.answers.rejectedBefore.description", interaction.locale)(),
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: strings.description,
					color: constants.colors.red,
				},
			],
		});

		return false;
	}

	return true;
}

export { handleSelectLanguageProficiency };
