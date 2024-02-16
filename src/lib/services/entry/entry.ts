import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import { FeatureLanguage, Locale } from "../../../constants/languages";
import { trim } from "../../../formatting";
import * as Logos from "../../../types";
import { proficiency } from "../../commands/social/roles/categories/language";
import { EntryRequest } from "../../database/entry-request";
import { Guild, timeStructToMilliseconds } from "../../database/guild";
import { User } from "../../database/user";
import diagnostics from "../../diagnostics";
import {
	Modal,
	createModalComposer,
	decodeId,
	editReply,
	encodeId,
	getLocaleData,
	postponeReply,
	reply,
} from "../../interactions";
import { snowflakeToTimestamp } from "../../utils";
import { LocalService } from "../service";

type EntryStepButtonID = [parameter: string];

type EntryConfiguration = NonNullable<Guild["features"]["server"]["features"]>["entry"];
type VerificationConfiguration = NonNullable<Guild["features"]["moderation"]["features"]>["verification"];

const steps = Object.values(constants.components.entry);

class EntryService extends LocalService {
	get configuration(): EntryConfiguration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.features.server.features?.entry;
	}

	get verificationConfiguration(): VerificationConfiguration | undefined {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return undefined;
		}

		return guildDocument.features.moderation.features?.verification;
	}

	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	async interactionCreate(interactionRaw: Discord.Interaction): Promise<void> {
		if (interactionRaw.type !== Discord.InteractionTypes.MessageComponent) {
			return;
		}

		const customId = interactionRaw.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [id, ..._] = decodeId(customId);
		if (!steps.includes(id)) {
			return;
		}

		const localeData = await getLocaleData(this.client, interactionRaw);
		const interaction: Logos.Interaction = { ...interactionRaw, ...localeData };

		const [step, parameter] = decodeId<EntryStepButtonID>(customId);
		switch (step) {
			case constants.components.entry.acceptedRules: {
				this.handleAcceptRules(interaction);
				break;
			}
			case constants.components.entry.requestedVerification: {
				this.handleRequestVerification(interaction, parameter);
				break;
			}
			case constants.components.entry.selectedLanguageProficiency: {
				this.handleSelectLanguageProficiency(interaction, parameter);
				break;
			}
			default: {
				this.client.log.warn(`Entry step with ID '${step}' not handled.`);
				return;
			}
		}
	}

	private async handleAcceptRules(interaction: Logos.Interaction): Promise<void> {
		const locale = interaction.locale;

		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return;
		}

		const strings = {
			title: this.client.localise("entry.proficiency.title", locale)(),
			description: {
				chooseProficiency: this.client.localise(
					"entry.proficiency.description.chooseProficiency",
					locale,
				)({
					language: interaction.featureLanguage,
				}),
				canChangeLater: this.client.localise(
					"entry.proficiency.description.canChangeLater",
					locale,
				)({
					command: "`/profile roles`",
				}),
			},
		};

		reply(this.client, interaction, {
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
							name: this.client.localise(`${proficiencyRole.id}.name`, locale)(),
						};

						return {
							type: Discord.MessageComponentTypes.Button,
							label: strings.name,
							customId: encodeId<EntryStepButtonID>(constants.components.entry.selectedLanguageProficiency, [
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

	private async handleRequestVerification(interaction: Logos.Interaction, parameter: string): Promise<void> {
		const locale = interaction.locale;

		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const requestedRoleId = BigInt(parameter);

		let session = this.client.database.openSession();

		const guildDocument =
			this.client.documents.guilds.get(guild.id.toString()) ??
			(await session.get<Guild>(`guilds/${guild.id}`).then((value) => value ?? undefined));

		session.dispose();

		if (guildDocument === undefined) {
			return;
		}

		session = this.client.database.openSession();

		const userDocument =
			this.client.documents.users.get(interaction.user.id.toString()) ??
			(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined));

		session.dispose();

		if (userDocument === undefined) {
			return;
		}

		session = this.client.database.openSession();

		const entryRequestDocument =
			this.client.documents.entryRequests.get(`${guildDocument.guildId}/${userDocument.account.id}`) ??
			(await session
				.get<EntryRequest>(`entryRequests/${userDocument.account.id}/${guildDocument.guildId}`)
				.then((value) => value ?? undefined));

		session.dispose();

		if (entryRequestDocument !== undefined) {
			const strings = {
				title: this.client.localise("entry.verification.answers.alreadyAnswered.title", locale)(),
				description: this.client.localise("entry.verification.answers.alreadyAnswered.description", locale)(),
			};

			reply(this.client, interaction, {
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

		const verificationService = this.client.getPromptService(this.guildId, { type: "verification" });
		if (verificationService === undefined) {
			return;
		}

		createModalComposer<EntryRequest["answers"]>(this.client, interaction, {
			modal: this.generateVerificationQuestionModal(interaction.featureLanguage, { locale }),
			onSubmit: async (submission, answers) => {
				if (this.client.documents.entryRequests.has(`${guild.id}/${userDocument.account.id}`)) {
					const strings = {
						title: this.client.localise("entry.verification.answers.alreadyAnswered.title", locale)(),
						description: this.client.localise("entry.verification.answers.alreadyAnswered.description", locale)(),
					};

					reply(this.client, submission, {
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

				await postponeReply(this.client, submission);

				const session = this.client.database.openSession();

				const entryRequestDocument = {
					id: `entryRequests/${guild.id}/${userDocument.account.id}`,
					authorId: userDocument.account.id,
					guildId: guild.id.toString(),
					answers,
					requestedRoleId: requestedRoleId.toString(),
					isFinalised: false,
					createdAt: Date.now(),
					"@metadata": { "@collection": "EntryRequests" },
				};

				await session.set(entryRequestDocument);
				await session.saveChanges();

				session.dispose();

				const journallingService = this.client.getJournallingService(this.guildId);
				journallingService?.log("entryRequestSubmit", { args: [interaction.user, entryRequestDocument] });

				const userId = BigInt(userDocument.account.id);

				const user = this.client.entities.users.get(userId);
				if (user === undefined) {
					return "failure";
				}

				const prompt = await verificationService.savePrompt(user, entryRequestDocument);
				if (prompt === undefined) {
					return "failure";
				}

				const partialId = `${guild.id}/${user.id}`;
				verificationService.registerDocument(partialId, entryRequestDocument);
				verificationService.registerPrompt(prompt, userId, partialId, entryRequestDocument);
				verificationService.registerHandler(partialId);

				const strings = {
					title: this.client.localise("entry.verification.answers.submitted.title", locale)(),
					description: {
						submitted: this.client.localise("entry.verification.answers.submitted.description.submitted", locale)(),
						willBeReviewed: this.client.localise(
							"entry.verification.answers.submitted.description.willBeReviewed",
							locale,
						)(),
					},
				};

				editReply(this.client, submission, {
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
							title: this.client.localise("entry.verification.answers.failed.title", locale)(),
							description: this.client.localise("entry.verification.answers.failed.description", locale)(),
						};

						editReply(this.client, submission, {
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
		language: FeatureLanguage,
		{ locale }: { locale: Locale },
	): Modal<EntryRequest["answers"]> {
		const strings = {
			title: this.client.localise("verification.title", locale)(),
			reason: this.client.localise("verification.fields.reason", locale)({ language }),
			aim: this.client.localise("verification.fields.aim", locale)(),
			whereFound: this.client.localise("verification.fields.whereFound", locale)(),
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

	private async handleSelectLanguageProficiency(interaction: Logos.Interaction, parameter: string): Promise<void> {
		const locale = interaction.locale;

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

		const canEnter = await this.vetUser(interaction, { locale });
		if (!canEnter) {
			return;
		}

		const requiresVerification = this.requiresVerification(interaction.user);
		if (requiresVerification === undefined) {
			return;
		}

		if (requiresVerification) {
			const session = this.client.database.openSession();

			const userDocument =
				this.client.documents.users.get(interaction.user.id.toString()) ??
				(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
				(await (async () => {
					const userDocument = {
						...({
							id: `users/${interaction.user.id}`,
							account: { id: interaction.user.id.toString() },
							createdAt: Date.now(),
						} satisfies User),
						"@metadata": { "@collection": "Users" },
					};
					await session.set(userDocument);
					await session.saveChanges();

					return userDocument as User;
				})());

			session.dispose();

			const isVerified = userDocument?.account.authorisedOn?.includes(this.guildIdString);

			if (!isVerified) {
				const strings = {
					title: this.client.localise("entry.verification.getVerified.title", locale)(),
					description: {
						verificationRequired: this.client.localise(
							"entry.verification.getVerified.description.verificationRequired",
							locale,
						)({
							server_name: guild.name,
						}),
						honestAnswers: this.client.localise("entry.verification.getVerified.description.honestAnswers", locale)(),
						understood: this.client.localise("entry.verification.getVerified.description.understood", locale)(),
					},
				};

				reply(this.client, interaction, {
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
									customId: encodeId<EntryStepButtonID>(constants.components.entry.requestedVerification, [
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
			title: this.client.localise("entry.proficiency.receivedAccess.title", locale)(),
			description: {
				nowMember: this.client.localise(
					"entry.proficiency.receivedAccess.description.nowMember",
					locale,
				)({
					server_name: guild.name,
				}),
				toStart: this.client.localise("entry.proficiency.receivedAccess.description.toStart", locale)(),
			},
		};

		await reply(this.client, interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${constants.symbols.responses.celebration} ${strings.description.nowMember}\n\n${strings.description.toStart}`,
					image: { url: constants.gifs.welcome },
					color: constants.colors.lightGreen,
				},
			],
		});

		this.client.bot.rest
			.addRole(guild.id, interaction.user.id, role.id, "User-requested role addition.")
			.catch(() =>
				this.client.log.warn(
					`Failed to add ${diagnostics.display.role(role)} to ${diagnostics.display.user(
						interaction.user,
					)} on ${diagnostics.display.guild(guild.id)}.`,
				),
			);
	}

	private async vetUser(interaction: Logos.Interaction, { locale }: { locale: Locale }): Promise<boolean> {
		const session = this.client.database.openSession();

		const userDocument =
			this.client.documents.users.get(interaction.user.id.toString()) ??
			(await session.get<User>(`users/${interaction.user.id}`).then((value) => value ?? undefined)) ??
			(await (async () => {
				const userDocument = {
					...({
						id: `users/${interaction.user.id}`,
						account: { id: interaction.user.id.toString() },
						createdAt: Date.now(),
					} satisfies User),
					"@metadata": { "@collection": "Users" },
				};
				await session.set(userDocument);
				await session.saveChanges();

				return userDocument as User;
			})());

		session.dispose();

		if (userDocument === undefined) {
			const strings = {
				title: this.client.localise("entry.verification.verifyingAccount.failed.title", locale)(),
				description: this.client.localise("entry.verification.verifyingAccount.failed.description", locale)(),
			};

			reply(this.client, interaction, {
				embeds: [
					{
						title: strings.title,
						description: strings.description,
						color: constants.colors.red,
					},
				],
			});

			this.client.log.error(
				`Failed to vet ${diagnostics.display.user(
					interaction.user,
				)} trying to enter the server due to their user document having been returned as undefined.`,
			);

			return false;
		}

		const guildId = interaction.guildId;
		if (guildId === undefined) {
			return false;
		}

		const entryRequestDocument = this.client.documents.entryRequests.get(`${guildId}/${userDocument.id}`);
		if (entryRequestDocument !== undefined && !entryRequestDocument.isFinalised) {
			const strings = {
				title: this.client.localise("entry.verification.answers.alreadyAnswered.title", locale)(),
				description: this.client.localise("entry.verification.answers.alreadyAnswered.description", locale)(),
			};

			reply(this.client, interaction, {
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

		if (userDocument.account.authorisedOn?.includes(guildId.toString())) {
			return true;
		}

		if (userDocument.account.rejectedOn?.includes(guildId.toString())) {
			const strings = {
				title: this.client.localise("entry.verification.answers.rejectedBefore.title", locale)(),
				description: this.client.localise("entry.verification.answers.rejectedBefore.description", locale)(),
			};

			reply(this.client, interaction, {
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

	requiresVerification(user: Logos.User): boolean | undefined {
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
