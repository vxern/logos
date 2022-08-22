import {
	_,
	ApplicationCommandFlags,
	getDmChannel,
	guildIconURL,
	Interaction,
	InteractionResponseTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../../deps.ts';
import { Client, getLanguage } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { Article } from '../../../../database/structs/articles/article.ts';
import { createVerificationPrompt, trim } from '../../../../utils.ts';
import {
	openArticleEditor,
	verifyCanAct,
	verifyIsContributor,
} from '../article.ts';

/** Allows the user to write and submit a new article. */
async function createArticle(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	function showArticleSubmissionFailure(interaction: Interaction): void {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to submit article',
						description: `Your article failed to be submitted.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const isContributor = await verifyIsContributor(interaction.member!);

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id.toString(),
	);
	if (!author) return showArticleSubmissionFailure(interaction);

	const canAct = await verifyCanAct({
		client: client,
		user: author,
		action: 'CREATE',
		isContributor: isContributor,
	});
	if (canAct === undefined) return showArticleSubmissionFailure(interaction);
	if (canAct === false) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Maximum number of articles reached',
						description: `You must wait before submitting another article.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const articles = await client.database.getArticles(
		'language',
		getLanguage(client, interaction.guildId!),
	);
	if (!articles) return showArticleSubmissionFailure(interaction);

	const [submission, content, dialect] = await openArticleEditor(
		client,
		interaction,
		undefined,
		articles.map((article) => article.data),
	);
	if (!content) return showArticleSubmissionFailure(submission);

	const language = getLanguage(client, submission.guildId!);

	const article: Article = {
		author: author.ref,
		language: language,
		dialect: dialect,
		content: content,
	};

	let [isAccepted, by] = [true, interaction.member!];

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	if (!isContributor) {
		sendInteractionResponse(client.bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'Submission received.',
					description:
						`Your article, \`${article.content.title}\`, is awaiting verification.`,
					color: configuration.interactions.responses.colors.yellow,
				}],
			},
		});

		const verificationPromptInformation = await createVerificationPrompt(
			client,
			submission.guildId!,
			{
				title: content.title,
				fields: [
					{
						name: 'Body',
						value: trim(content.body, 300),
					},
					...(!content.footer ? [] : [{
						name: 'Footer',
						value: trim(content.footer, 300),
					}]),
				],
			},
		);
		if (!verificationPromptInformation) return;

		[isAccepted, by] = verificationPromptInformation;

		const dmChannel = await getDmChannel(client.bot, interaction.user.id);
		if (!dmChannel) return;

		sendMessage(client.bot, dmChannel.id, {
			embeds: [
				{
					thumbnail: (() => {
						const iconURL = guildIconURL(client.bot, guild.id, guild.icon);
						if (!iconURL) return undefined;

						return {
							url: iconURL,
						};
					})(),
					...(isAccepted
						? {
							title: '🥳 Your article has been created.',
							description:
								`Your article is now available to be read by everybody on ${guild
									.name!}.`,
							color: configuration.interactions.responses.colors.green,
						}
						: {
							title:
								'😔 Unfortunately, your article creation request has been rejected.',
							description:
								'This is likely because the article content was inappropriate or incorrect.',
							color: configuration.interactions.responses.colors.red,
						}),
				},
			],
		});

		client.logging.get(submission.guildId!)?.log(
			isAccepted ? 'articleCreateAccept' : 'articleCreateReject',
			article,
			by,
		);

		if (!isAccepted) return;
	} else {
		sendInteractionResponse(client.bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: '🥳 Your article has been created.',
					description:
						`Your article is now available to be read by everybody on ${guild.name}.`,
					color: configuration.interactions.responses.colors.green,
				}],
			},
		});
	}

	const document = await client.database.createArticle(article);
	if (!document) return showArticleSubmissionFailure(submission);

	client.logging.get(submission.guildId!)?.log(
		'articleCreate',
		document.data,
		submission.member!,
	);

	return;
}

export { createArticle };
