import { Locale } from "logos:constants/languages";
import diagnostics from "logos:core/diagnostics";
import { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";
import { EntryRequestComposer } from "logos/commands/components/modal-composers/entry-request-composer";
import { EntryRequest, EntryRequestFormData } from "logos/database/entry-request";
import { Guild, timeStructToMilliseconds } from "logos/database/guild";
import { User } from "logos/database/user";
import { LocalService } from "logos/services/service";

class EntryService extends LocalService {
	readonly #_acceptedRulesButton: InteractionCollector;

	get configuration(): Guild["entry"] {
		return this.guildDocument?.entry;
	}

	get verificationConfiguration(): Guild["verification"] {
		return this.guildDocument?.verification;
	}

	constructor(client: Client, { guildId }: { guildId: bigint }) {
		super(client, { identifier: "EntryService", guildId });

		this.#_acceptedRulesButton = new InteractionCollector(client, {
			guildId,
			customId: constants.components.acceptedRules,
			isPermanent: true,
		});
	}

	async start(): Promise<void> {
		this.#_acceptedRulesButton.onCollect(this.#handleAcceptRules.bind(this));

		await this.client.registerInteractionCollector(this.#_acceptedRulesButton);
	}

	async stop(): Promise<void> {
		await this.#_acceptedRulesButton.close();
	}

	async #handleAcceptRules(buttonPress: Logos.Interaction): Promise<void> {
		const guildDocument = this.guildDocument;
		if (guildDocument === undefined) {
			return;
		}

		const languageProficiencyButtons = new InteractionCollector<[index: string]>(this.client, {
			only: [buttonPress.user.id],
			dependsOn: this.#_acceptedRulesButton,
			isSingle: true,
		});

		languageProficiencyButtons.onCollect((buttonPress) =>
			this.#handlePickLanguageProficiency(buttonPress, { collector: languageProficiencyButtons }),
		);

		await this.client.registerInteractionCollector(languageProficiencyButtons);

		const strings = {
			title: this.client.localise("entry.proficiency.title", buttonPress.locale)(),
			description: {
				chooseProficiency: this.client.localise(
					"entry.proficiency.description.chooseProficiency",
					buttonPress.locale,
				)({
					language: buttonPress.featureLanguage,
				}),
				canChangeLater: this.client.localise(
					"entry.proficiency.description.canChangeLater",
					buttonPress.locale,
				)({
					// TODO(vxern): Localise commands?
					command: "`/profile roles`",
				}),
			},
		};

		await this.client.notice(buttonPress, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.chooseProficiency}\n\n${strings.description.canChangeLater}`,
				},
			],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: Object.values(
						constants.roles.language.categories.proficiency.collection.list,
					).map<Discord.ButtonComponent>((proficiencyRole, index) => {
						const strings = {
							name: this.client.localise(`${proficiencyRole.id}.name`, buttonPress.locale)(),
						};

						return {
							type: Discord.MessageComponentTypes.Button,
							label: strings.name,
							customId: languageProficiencyButtons.encodeId([index.toString()]),
							style: Discord.ButtonStyles.Secondary,
							emoji: { name: proficiencyRole.emoji },
						};
					}) as [Discord.ButtonComponent],
				},
			],
		});
	}

	async #handlePickLanguageProficiency(
		buttonPress: Logos.Interaction<[index: string]>,
		{ collector }: { collector: InteractionCollector<[index: string]> },
	): Promise<void> {
		const locale = buttonPress.locale;

		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const index = Number.parseInt(buttonPress.metadata[1]);
		const snowflake = (
			Object.values(constants.roles.language.categories.proficiency.collection.list)[index]?.snowflakes as
				| Record<string, string>
				| undefined
		)?.[this.guildIdString];
		if (snowflake === undefined) {
			return;
		}

		const roleId = BigInt(snowflake);
		const role = guild.roles.get(roleId);
		if (role === undefined) {
			return;
		}

		const canEnter = await this.#vetUser(buttonPress, { locale });
		if (!canEnter) {
			return;
		}

		const requiresVerification = this.#requiresVerification(buttonPress.user);
		if (requiresVerification === undefined) {
			return;
		}

		if (requiresVerification) {
			const userDocument = await User.getOrCreate(this.client, { userId: buttonPress.user.id.toString() });

			const requestVerificationButton = new InteractionCollector<[index: string]>(this.client, {
				only: [buttonPress.user.id],
				dependsOn: collector,
				isSingle: true,
			});

			requestVerificationButton.onCollect(this.#handleRequestVerification.bind(this));

			await this.client.registerInteractionCollector(requestVerificationButton);

			const isVerified = userDocument.isAuthorisedOn({ guildId: this.guildIdString });
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

				await this.client.notice(buttonPress, {
					embeds: [
						{
							title: strings.title,
							description: `${strings.description.verificationRequired}\n\n${strings.description.honestAnswers}`,
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
									customId: requestVerificationButton.encodeId([buttonPress.metadata[1]]),
									emoji: { name: constants.emojis.understood },
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

		await this.client.success(buttonPress, {
			title: strings.title,
			description: `${constants.emojis.responses.celebration} ${strings.description.nowMember}\n\n${strings.description.toStart}`,
			image: { url: constants.gifs.welcome },
		});

		this.client.bot.rest
			.addRole(guild.id, buttonPress.user.id, role.id, "User-requested role addition.")
			.catch(() =>
				this.log.warn(
					`Failed to add ${diagnostics.display.role(role)} to ${diagnostics.display.user(
						buttonPress.user,
					)} on ${diagnostics.display.guild(guild.id)}.`,
				),
			);
	}

	async #handleRequestVerification(buttonPress: Logos.Interaction<[index: string]>): Promise<void> {
		const locale = buttonPress.locale;

		const guild = this.guild;
		if (guild === undefined) {
			return;
		}

		const index = Number.parseInt(buttonPress.metadata[1]);
		const snowflake = (
			Object.values(constants.roles.language.categories.proficiency.collection.list)[index]?.snowflakes as
				| Record<string, string>
				| undefined
		)?.[this.guildIdString];
		if (snowflake === undefined) {
			return;
		}

		const requestedRoleId = BigInt(snowflake);

		const entryRequestDocument = await EntryRequest.get(this.client, {
			guildId: this.guildId.toString(),
			authorId: buttonPress.user.id.toString(),
		});

		if (entryRequestDocument !== undefined) {
			const strings = {
				title: this.client.localise("entry.verification.answers.alreadyAnswered.title", locale)(),
				description: this.client.localise("entry.verification.answers.alreadyAnswered.description", locale)(),
			};

			await this.client.pushback(buttonPress, {
				title: strings.title,
				description: strings.description,
			});

			return;
		}

		const verificationService = this.client.getPromptService(this.guildId, { type: "verification" });
		if (verificationService === undefined) {
			return;
		}

		const entryRequest = await EntryRequest.get(this.client, {
			guildId: guild.id.toString(),
			authorId: buttonPress.user.id.toString(),
		});

		const composer = new EntryRequestComposer(this.client, { interaction: buttonPress });

		composer.onSubmit(
			async (
				submission: Logos.Interaction,
				{ locale }: { locale: Locale },
				{ formData }: { formData: EntryRequestFormData },
			) => {
				if (entryRequest !== undefined) {
					const strings = {
						title: this.client.localise("entry.verification.answers.alreadyAnswered.title", locale)(),
						description: this.client.localise("entry.verification.answers.alreadyAnswered.description", locale)(),
					};

					await this.client.pushback(submission, {
						title: strings.title,
						description: strings.description,
					});

					return;
				}

				await this.client.postponeReply(submission);

				const entryRequestDocument = await EntryRequest.create(this.client, {
					guildId: guild.id.toString(),
					authorId: buttonPress.user.id.toString(),
					requestedRoleId: requestedRoleId.toString(),
					formData,
				});

				await this.client.tryLog("entryRequestSubmit", {
					guildId: guild.id,
					args: [buttonPress.user, entryRequestDocument],
				});

				const user = this.client.entities.users.get(buttonPress.user.id);
				if (user === undefined) {
					return;
				}

				const prompt = await verificationService.savePrompt(user, entryRequestDocument);
				if (prompt === undefined) {
					return;
				}

				verificationService.registerDocument(entryRequestDocument);
				verificationService.registerPrompt(prompt, buttonPress.user.id, entryRequestDocument);
				verificationService.registerHandler(entryRequestDocument);

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

				await this.client.succeeded(submission, {
					title: strings.title,
					description: `${strings.description.submitted}\n\n${strings.description.willBeReviewed}`,
				});
			},
		);
	}

	async #vetUser(interaction: Logos.Interaction, { locale }: { locale: Locale }): Promise<boolean> {
		const [userDocument, entryRequestDocument] = await Promise.all([
			User.getOrCreate(this.client, { userId: interaction.user.id.toString() }),
			EntryRequest.get(this.client, { guildId: this.guildIdString, authorId: interaction.user.id.toString() }),
		]);

		if (entryRequestDocument !== undefined && !entryRequestDocument.isFinalised) {
			const strings = {
				title: this.client.localise("entry.verification.answers.alreadyAnswered.title", locale)(),
				description: this.client.localise("entry.verification.answers.alreadyAnswered.description", locale)(),
			};

			await this.client.pushback(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return false;
		}

		if (userDocument.isAuthorisedOn({ guildId: this.guildIdString })) {
			return true;
		}

		if (userDocument.isRejectedOn({ guildId: this.guildIdString })) {
			const strings = {
				title: this.client.localise("entry.verification.answers.rejectedBefore.title", locale)(),
				description: this.client.localise("entry.verification.answers.rejectedBefore.description", locale)(),
			};

			await this.client.error(interaction, {
				title: strings.title,
				description: strings.description,
			});

			return false;
		}

		return true;
	}

	#requiresVerification(user: Logos.User): boolean | undefined {
		const verificationConfiguration = this.verificationConfiguration;
		if (verificationConfiguration === undefined) {
			return undefined;
		}

		for (const rule of verificationConfiguration.activation) {
			switch (rule.type) {
				case "account-age": {
					const createdAt = Discord.snowflakeToTimestamp(user.id);
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
