import { _, Interaction } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { Article } from '../../../../database/structs/articles/article.ts';
import {
	createVerificationPrompt,
	messageUser,
	trim,
} from '../../../../utils.ts';
import {
	openArticleEditor,
	verifyCanAct,
	verifyIsContributor,
} from '../article.ts';

/** Allows the user to write and submit an article. */
async function createArticle(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	function showArticleSubmissionFailure(interaction: Interaction): void {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Failed to submit article',
				description: `Your article failed to be submitted.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	const isContributor = await verifyIsContributor(interaction.member!);

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id,
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
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Maximum number of articles reached',
				description: `You must wait before submitting another article.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	const articles = await client.database.getArticles(
		'language',
		client.getLanguage(interaction.guild!),
	);
	if (!articles) return showArticleSubmissionFailure(interaction);

	const [submission, content, dialect] = await openArticleEditor(
		client,
		interaction,
		undefined,
		articles.map((article) => article.data),
	);
	if (!content) return showArticleSubmissionFailure(submission);

	const language = client.getLanguage(submission.guild!);

	const article: Article = {
		author: author.ref,
		language: language,
		dialect: dialect,
		content: content,
	};

	let [isAccepted, by] = [true, interaction.member!];

	if (!isContributor) {
		submission.respond({
			ephemeral: true,
			embeds: [{
				title: 'Submission received.',
				description:
					`Your article, \`${article.content.title}\`, is awaiting verification.`,
				color: configuration.interactions.responses.colors.yellow,
			}],
		});

		[isAccepted, by] = await createVerificationPrompt(
			client,
			submission.guild!,
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

		messageUser(
			interaction.user!,
			interaction.guild!,
			isAccepted
				? {
					title: '🥳 Your article has been created.',
					description:
						`Your article is now available to be read by everybody on ${interaction
							.guild!.name!}.`,
					color: configuration.interactions.responses.colors.green,
				}
				: {
					title:
						'😔 Unfortunately, your article creation request has been rejected.',
					description:
						'This is likely because the article content was inappropriate or incorrect.',
					color: configuration.interactions.responses.colors.red,
				},
		);

		client.logging.get(submission.guild!.id)?.log(
			isAccepted ? 'articleCreateAccept' : 'articleCreateReject',
			article,
			by,
		);

		if (!isAccepted) return;
	} else {
		submission.respond({
			ephemeral: true,
			embeds: [{
				title: '🥳 Your article has been created.',
				description:
					`Your article is now available to be read by everybody on ${interaction
						.guild!.name!}.`,
				color: configuration.interactions.responses.colors.green,
			}],
		});
	}

	const document = await client.database.createArticle(article);
	if (!document) return showArticleSubmissionFailure(submission);

	client.logging.get(submission.guild!.id)?.log(
		'articleCreate',
		document.data,
		submission.member!,
	);
}

export { createArticle };
