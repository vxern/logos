import constants from "../../../constants.js";
import { trim } from "../../../formatting.js";
import { Language } from "../../../types.js";
import { localise } from "../../client.js";
import { proficiency } from "../../commands/social/roles/categories/language.js";
import { stringifyValue } from "../../database/database.js";
import { EntryRequest } from "../../database/structs/entry-request.js";
import { Guild, timeStructToMilliseconds } from "../../database/structs/guild.js";
import { Modal, createModalComposer, decodeId, editReply, encodeId, postponeReply, reply } from "../../interactions.js";
import { snowflakeToTimestamp } from "../../utils.js";
import { LocalService } from "../service.js";
import * as Discord from "discordeno";

type EntryStepButtonID = [parameter: string];

type EntryConfiguration = NonNullable<Guild["features"]["server"]["features"]>["entry"];
type VerificationConfiguration = NonNullable<Guild["features"]["moderation"]["features"]>["verification"];

const steps = Object.values(constants.staticComponentIds.entry);

class EntryService extends LocalService {
	get configuration(): EntryConfiguration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.data.features.server.features?.entry;
	}

	get verificationConfiguration(): VerificationConfiguration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.data.features.moderation.features?.verification;
	}

	async interactionCreate(bot: Discord.Bot, interaction: Discord.Interaction): Promise<void> {
		if (interaction.type !== Discord.InteractionTypes.MessageComponent) {
			return;
		}

		const customId = interaction.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [id, ..._] = decodeId(customId);
		if (!steps.includes(id)) {
			return;
		}

		const [step, parameter] = decodeId<EntryStepButtonID>(customId);
		switch (step) {
			case constants.staticComponentIds.entry.acceptedRules: {
				this.handleAcceptRules(bot, interaction);
				break;
			}
			case constants.staticComponentIds.entry.requestedVerification: {
				this.handleRequestVerification(bot, interaction, parameter);
				break;
			}
			case constants.staticComponentIds.entry.selectedLanguageProficiency: {
				this.handleSelectLanguageProficiency(bot, interaction, parameter);
				break;
			}
			default: {
				this.client.log.warn(`Entry step with ID '${step}' not handled.`);
				return;
			}
		}
	}

	private async handleAcceptRules(bot: Discord.Bot, interaction: Discord.Interaction): Promise<void> {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return;
		}

		const strings = {
			title: localise(this.client, "entry.proficiency.title", interaction.locale)(),
			description: {
				chooseProficiency: localise(
					this.client,
					"entry.proficiency.description.chooseProficiency",
					interaction.locale,
				)({
					language: guildDocument.data.language,
				}),
				canChangeLater: localise(
					this.client,
					"entry.proficiency.description.canChangeLater",
					interaction.locale,
				)({
					command: "`/profile roles`",
				}),
			},
		};

		reply([this.client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.chooseProficiency}\n\n${strings.description.canChangeLater}`,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: proficiency.collection.list.map<Discord.ButtonComponent>((proficiencyRole, index) => {
						const strings = {
							name: localise(this.client, `${proficiencyRole.id}.name`, interaction.locale)(),
						};

						return {
							type: Discord.MessageComponentTypes.Button,
							label: strings.name,
							customId: encodeId<EntryStepButtonID>(constants.staticComponentIds.entry.selectedLanguageProficiency, [
								index.toString(),
							]),
							style: Discord.ButtonStyles.Secondary,
							emoji: { name: proficiencyRole.emoji },
						};
					}) as [Discord.ButtonComponent],
				},
			],
		});
	}

	private async handleRequestVerification(
		bot: Discord.Bot,
		interaction: Discord.Interaction,
		parameter: string,
	): Promise<void> {
		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const requestedRoleId = BigInt(parameter);

		const guildDocument = await this.client.database.adapters.guilds.getOrFetch(this.client, "id", guild.id.toString());
		if (guildDocument === undefined) {
			return;
		}

		const userDocument = await this.client.database.adapters.users.getOrFetchOrCreate(
			this.client,
			"id",
			interaction.user.id.toString(),
			interaction.user.id,
		);
		if (userDocument === undefined) {
			return;
		}

		const entryRequest = this.client.database.adapters.entryRequests.get(this.client, "submitterAndGuild", [
			userDocument.ref,
			guild.id.toString(),
		]);
		if (entryRequest !== undefined) {
			const strings = {
				title: localise(this.client, "entry.verification.answers.alreadyAnswered.title", interaction.locale)(),
				description: localise(
					this.client,
					"entry.verification.answers.alreadyAnswered.description",
					interaction.locale,
				)(),
			};

			reply([this.client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					},
				],
			});

			return;
		}

		const verificationService = this.client.services.prompts.verification.get(this.guildId);
		if (verificationService === undefined) {
			return;
		}

		createModalComposer<EntryRequest["answers"]>([this.client, bot], interaction, {
			modal: this.generateVerificationQuestionModal(guildDocument.data.language, interaction.locale),
			onSubmit: async (submission, answers) => {
				const submitterReferenceId = stringifyValue(userDocument.ref);

				if (
					this.client.database.cache.entryRequestBySubmitterAndGuild.has(
						`${submitterReferenceId}${constants.symbols.meta.idSeparator}${guild.id}`,
					)
				) {
					const strings = {
						title: localise(this.client, "entry.verification.answers.alreadyAnswered.title", interaction.locale)(),
						description: localise(
							this.client,
							"entry.verification.answers.alreadyAnswered.description",
							interaction.locale,
						)(),
					};

					reply([this.client, bot], submission, {
						embeds: [
							{
								title: strings.title,
								description: strings.description,
								color: constants.colors.darkRed,
							},
						],
					});

					return true;
				}

				await postponeReply([this.client, bot], submission);

				const entryRequest = await this.client.database.adapters.entryRequests.create(this.client, {
					createdAt: Date.now(),
					submitter: userDocument.ref,
					guild: guild.id.toString(),
					answers,
					votedFor: [],
					votedAgainst: [],
					requestedRole: requestedRoleId.toString(),
					isFinalised: false,
				});
				if (entryRequest === undefined) {
					return "failure";
				}

				const journallingService = this.client.services.journalling.get(this.guildId);
				journallingService?.log(bot, "entryRequestSubmit", { args: [interaction.user, entryRequest.data] });

				const userId = BigInt(userDocument.data.account.id);
				const reference = stringifyValue(entryRequest.ref);

				const user = this.client.cache.users.get(userId);
				if (user === undefined) {
					return "failure";
				}

				const prompt = await verificationService.savePrompt(bot, user, entryRequest);
				if (prompt === undefined) {
					return "failure";
				}

				verificationService.registerPrompt(prompt, userId, reference, entryRequest);
				verificationService.registerHandler([userId.toString(), this.guildIdString, reference]);

				const strings = {
					title: localise(this.client, "entry.verification.answers.submitted.title", interaction.locale)(),
					description: {
						submitted: localise(
							this.client,
							"entry.verification.answers.submitted.description.submitted",
							interaction.locale,
						)(),
						willBeReviewed: localise(
							this.client,
							"entry.verification.answers.submitted.description.willBeReviewed",
							interaction.locale,
						)(),
					},
				};

				editReply([this.client, bot], submission, {
					embeds: [
						{
							title: strings.title,
							description: `${strings.description.submitted}\n\n${strings.description.willBeReviewed}`,
							color: constants.colors.lightGreen,
						},
					],
				});

				return true;
			},
			onInvalid: async (submission, error) => {
				switch (error) {
					default: {
						const strings = {
							title: localise(this.client, "entry.verification.answers.failed.title", interaction.locale)(),
							description: localise(this.client, "entry.verification.answers.failed.description", interaction.locale)(),
						};

						editReply([this.client, bot], submission, {
							embeds: [
								{
									title: strings.title,
									description: strings.description,
									color: constants.colors.red,
								},
							],
						});

						return undefined;
					}
				}
			},
		});
	}

	private generateVerificationQuestionModal(
		language: Language,
		locale: string | undefined,
	): Modal<EntryRequest["answers"]> {
		const strings = {
			title: localise(this.client, "verification.title", locale)(),
			reason: localise(this.client, "verification.fields.reason", locale)({ language }),
			aim: localise(this.client, "verification.fields.aim", locale)(),
			whereFound: localise(this.client, "verification.fields.whereFound", locale)(),
		};

		return {
			title: strings.title,
			fields: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "reason",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.reason, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							minLength: 20,
							maxLength: 300,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "aim",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.aim, 45),
							style: Discord.TextStyles.Paragraph,
							required: true,
							minLength: 20,
							maxLength: 300,
						},
					],
				},
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							customId: "whereFound",
							type: Discord.MessageComponentTypes.InputText,
							label: trim(strings.whereFound, 45),
							style: Discord.TextStyles.Short,
							required: true,
							minLength: 5,
							maxLength: 50,
						},
					],
				},
			],
		};
	}

	private async handleSelectLanguageProficiency(
		bot: Discord.Bot,
		interaction: Discord.Interaction,
		parameter: string,
	): Promise<void> {
		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const snowflake = proficiency.collection.list[parseInt(parameter)]?.snowflakes[this.guildIdString];
		if (snowflake === undefined) {
			return;
		}

		const roleId = BigInt(snowflake);
		const role = guild.roles.get(roleId);
		if (role === undefined) {
			return;
		}

		const canEnter = await this.vetUser(bot, interaction);
		if (!canEnter) {
			return;
		}

		const requiresVerification = this.requiresVerification(interaction.user);
		if (requiresVerification === undefined) {
			return;
		}

		if (requiresVerification) {
			const userDocument = await this.client.database.adapters.users.getOrFetchOrCreate(
				this.client,
				"id",
				interaction.user.id.toString(),
				interaction.user.id,
			);

			const isVerified = userDocument?.data.account.authorisedOn?.includes(this.guildIdString);

			if (!isVerified) {
				const strings = {
					title: localise(this.client, "entry.verification.getVerified.title", interaction.locale)(),
					description: {
						verificationRequired: localise(
							this.client,
							"entry.verification.getVerified.description.verificationRequired",
							interaction.locale,
						)({
							server_name: guild.name,
						}),
						honestAnswers: localise(
							this.client,
							"entry.verification.getVerified.description.honestAnswers",
							interaction.locale,
						)(),
						understood: localise(
							this.client,
							"entry.verification.getVerified.description.understood",
							interaction.locale,
						)(),
					},
				};

				reply([this.client, bot], interaction, {
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
			title: localise(this.client, "entry.proficiency.receivedAccess.title", interaction.locale)(),
			description: {
				nowMember: localise(
					this.client,
					"entry.proficiency.receivedAccess.description.nowMember",
					interaction.locale,
				)({
					server_name: guild.name,
				}),
				toStart: localise(this.client, "entry.proficiency.receivedAccess.description.toStart", interaction.locale)(),
			},
		};

		await reply([this.client, bot], interaction, {
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
			this.client.log.warn(
				`Failed to add role with ID ${role.id} to member with ID ${interaction.user.id} in guild with ID ${guild.id}.`,
			),
		);
	}

	private async vetUser(bot: Discord.Bot, interaction: Discord.Interaction): Promise<boolean> {
		const userDocument = await this.client.database.adapters.users.getOrFetchOrCreate(
			this.client,
			"id",
			interaction.user.id.toString(),
			interaction.user.id,
		);
		if (userDocument === undefined) {
			const strings = {
				title: localise(this.client, "entry.verification.verifyingAccount.failed.title", interaction.locale)(),
				description: localise(
					this.client,
					"entry.verification.verifyingAccount.failed.description",
					interaction.locale,
				)(),
			};

			reply([this.client, bot], interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.red,
					},
				],
			});

			this.client.log.error(
				`Failed to vet user with ID ${interaction.user.id} trying to enter the server due to their user document being returned as undefined.`,
			);

			return false;
		}

		const guildId = interaction.guildId;
		if (guildId === undefined) {
			return false;
		}

		const entryRequest = this.client.database.adapters.entryRequests.get(this.client, "submitterAndGuild", [
			userDocument.ref,
			guildId.toString(),
		]);

		if (entryRequest !== undefined && !entryRequest.data.isFinalised) {
			const strings = {
				title: localise(this.client, "entry.verification.answers.alreadyAnswered.title", interaction.locale)(),
				description: localise(
					this.client,
					"entry.verification.answers.alreadyAnswered.description",
					interaction.locale,
				)(),
			};

			reply([this.client, bot], interaction, {
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
				title: localise(this.client, "entry.verification.answers.rejectedBefore.title", interaction.locale)(),
				description: localise(
					this.client,
					"entry.verification.answers.rejectedBefore.description",
					interaction.locale,
				)(),
			};

			reply([this.client, bot], interaction, {
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

	requiresVerification(user: Discord.User): boolean | undefined {
		const verificationConfiguration = this.verificationConfiguration;
		if (verificationConfiguration === undefined) {
			return undefined;
		}

		if (!verificationConfiguration.enabled) {
			return undefined;
		}

		for (const rule of verificationConfiguration.activation) {
			switch (rule.type) {
				case "account-age": {
					const createdAt = snowflakeToTimestamp(user.id);
					const age = Date.now() - createdAt;

					if (age < timeStructToMilliseconds(rule.value)) {
						return true;
					}

					break;
				}
			}
		}

		return false;
	}
}

export { EntryService };
export type { EntryStepButtonID };
