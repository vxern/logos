import {
	ApplicationCommandTypes,
	Bot,
	ButtonStyles,
	Embed,
	Interaction,
	InteractionTypes,
	MessageComponentTypes,
	TextStyles,
} from 'discordeno';
import { CommandTemplate } from 'logos/src/commands/command.ts';
import { logEvent } from 'logos/src/controllers/logging/logging.ts';
import { stringifyValue } from 'logos/src/database/database.ts';
import reportManager from 'logos/src/services/prompts/managers/reports.ts';
import { Client, localise } from 'logos/src/client.ts';
import {
	createInteractionCollector,
	createModalComposer,
	deleteReply,
	editReply,
	Modal,
	postponeReply,
	reply,
} from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { trim } from 'logos/formatting.ts';
import configuration from 'logos/configuration.ts';
import { getTextChannel, verifyIsWithinLimits } from 'logos/src/utils.ts';

const command: CommandTemplate = {
	name: 'report',
	type: ApplicationCommandTypes.ChatInput,
	defaultMemberPermissions: ['VIEW_CHANNEL'],
	handle: handleMakeReport,
};

enum ReportError {
	Failure = 'failure',
	CannotReportSelf = 'cannot_report_self',
}

async function handleMakeReport([client, bot]: [Client, Bot], interaction: Interaction): Promise<void> {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const authorDocument = await client.database.adapters.users.getOrFetchOrCreate(
		client,
		'id',
		interaction.user.id.toString(),
		interaction.user.id,
	);
	if (authorDocument === undefined) return;

	const reportsByAuthorAndGuild = client.database.adapters.reports.get(
		client,
		'authorAndGuild',
		[authorDocument.ref, guild.id.toString()],
	);
	if (reportsByAuthorAndGuild !== undefined) {
		const strings = {
			title: localise(client, 'report.strings.tooMany.title', interaction.locale)(),
			description: localise(client, 'report.strings.tooMany.description', interaction.locale)(),
		};

		const reports = Array.from(reportsByAuthorAndGuild.values());
		if (!verifyIsWithinLimits(reports, configuration.commands.report.limitUses, configuration.commands.report.within)) {
			return void reply(
				[client, bot],
				interaction,
				{
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
				},
			);
		}
	}

	return void createModalComposer([client, bot], interaction, {
		modal: generateReportModal(client, interaction.locale),
		onSubmit: async (submission, answers) => {
			await postponeReply([client, bot], submission);

			const report = await client.database.adapters.reports.create(
				client,
				{
					createdAt: Date.now(),
					author: authorDocument.ref,
					guild: guild.id.toString(),
					users: answers.users!,
					reason: answers.reason!,
					messageLink: answers.message_link,
					isResolved: false,
				},
			);
			if (report === undefined) return ReportError.Failure;

			const channel = getTextChannel(guild, configuration.guilds.channels.reports);
			if (channel === undefined) return true;

			logEvent([client, bot], guild, 'reportSubmit', [
				interaction.member!,
				report.data,
			]);

			const userId = BigInt(authorDocument.data.account.id);
			const reference = stringifyValue(report.ref);

			const user = client.cache.users.get(userId);
			if (user === undefined) return ReportError.Failure;

			const prompt = await reportManager.savePrompt([client, bot], guild, channel, user, report);
			if (prompt === undefined) return ReportError.Failure;

			reportManager.registerPrompt(prompt, userId, reference, report);
			reportManager.registerHandler(client, [userId.toString(), guild.id.toString(), reference]);

			const strings = {
				title: localise(client, 'report.strings.submitted.title', interaction.locale)(),
				description: localise(client, 'report.strings.submitted.description', interaction.locale)(),
			};

			editReply([client, bot], submission, {
				embeds: [{
					title: strings.title,
					description: strings.description,
					color: constants.colors.lightGreen,
				}],
			});

			return true;
		},
		// deno-lint-ignore require-await
		onInvalid: async (submission, error) =>
			handleSubmittedInvalidReport([client, bot], submission, error as ReportError | undefined),
	});
}

function handleSubmittedInvalidReport(
	[client, bot]: [Client, Bot],
	submission: Interaction,
	error: ReportError | undefined,
): Promise<Interaction | undefined> {
	return new Promise((resolve) => {
		const continueId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: (_, selection) => {
				deleteReply([client, bot], submission);
				resolve(selection);
			},
		});

		const cancelId = createInteractionCollector([client, bot], {
			type: InteractionTypes.MessageComponent,
			onCollect: (_, cancelSelection) => {
				const returnId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_, returnSelection) => resolve(returnSelection),
				});

				const leaveId = createInteractionCollector([client, bot], {
					type: InteractionTypes.MessageComponent,
					onCollect: (_, _leaveSelection) => {
						deleteReply([client, bot], submission);
						deleteReply([client, bot], cancelSelection);
						resolve(undefined);
					},
				});

				const strings = {
					title: localise(client, 'report.strings.sureToCancel.title', cancelSelection.locale)(),
					description: localise(client, 'report.strings.sureToCancel.description', cancelSelection.locale)(),
					stay: localise(client, 'prompts.stay', cancelSelection.locale)(),
					leave: localise(client, 'prompts.leave', cancelSelection.locale)(),
				};

				reply([client, bot], cancelSelection, {
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
					components: [{
						type: MessageComponentTypes.ActionRow,
						components: [{
							type: MessageComponentTypes.Button,
							customId: returnId,
							label: strings.stay,
							style: ButtonStyles.Success,
						}, {
							type: MessageComponentTypes.Button,
							customId: leaveId,
							label: strings.leave,
							style: ButtonStyles.Danger,
						}],
					}],
				});
			},
		});

		let embed!: Embed;
		switch (error) {
			case ReportError.Failure:
			default: {
				const strings = {
					title: localise(client, 'report.strings.failed.title', submission.locale)(),
					description: localise(client, 'report.strings.failed.description', submission.locale)(),
				};

				editReply([client, bot], submission, {
					embeds: [{
						title: strings.title,
						description: strings.description,
						color: constants.colors.dullYellow,
					}],
				});
				break;
			}
			case ReportError.CannotReportSelf: {
				const strings = {
					title: localise(client, 'report.strings.cannotReportSelf.title', submission.locale)(),
					description: localise(client, 'report.strings.cannotReportSelf.description', submission.locale)(),
				};

				embed = {
					title: strings.title,
					description: strings.description,
					color: constants.colors.dullYellow,
				};
			}
		}

		const strings = {
			continue: localise(client, 'prompts.continue', submission.locale)(),
			cancel: localise(client, 'prompts.cancel', submission.locale)(),
		};

		editReply([client, bot], submission, {
			embeds: [embed],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.Button,
					customId: continueId,
					label: strings.continue,
					style: ButtonStyles.Success,
				}, {
					type: MessageComponentTypes.Button,
					customId: cancelId,
					label: strings.cancel,
					style: ButtonStyles.Danger,
				}],
			}],
		});
	});
}

function generateReportModal<T extends string>(client: Client, locale: string | undefined): Modal<T> {
	const strings = {
		title: localise(client, 'report.title', locale)(),
		reason: localise(client, 'report.fields.reason', locale)(),
		users: localise(client, 'report.fields.users', locale)(),
		link: localise(client, 'report.fields.link', locale)(),
	};

	return {
		title: strings.title,
		fields: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'reason',
				type: MessageComponentTypes.InputText,
				label: trim(strings.reason, 45),
				style: TextStyles.Paragraph,
				required: true,
				minLength: 16,
				maxLength: 256,
			}],
		}, {
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'users',
				type: MessageComponentTypes.InputText,
				label: trim(strings.users, 45),
				style: TextStyles.Short,
				required: true,
				maxLength: 256,
			}],
		}, {
			type: MessageComponentTypes.ActionRow,
			components: [{
				customId: 'message_link',
				type: MessageComponentTypes.InputText,
				label: trim(strings.link, 45),
				style: TextStyles.Short,
				required: false,
				maxLength: 128,
			}],
		}],
	} as Modal<T>;
}

export default command;
