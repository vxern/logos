import { _, Interaction } from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { Article } from '../../../../database/structs/articles/article.ts';
import { createVerificationPrompt, messageUser } from '../../../../utils.ts';
import { openArticleEditor } from '../article.ts';

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

	const user = await client.database.getOrCreateUser('id', interaction.user.id);
	if (!user) return showArticleSubmissionFailure(interaction);

	const articlesByAuthor = await client.database.getArticles(
		'author',
		user.ref,
	);
	if (!articlesByAuthor) return showArticleSubmissionFailure(interaction);

	const articleTimestamps = articlesByAuthor
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.

	const timestampSlice = articleTimestamps.slice(
		0,
		configuration.interactions.articles.create.maximum,
	);

	const canCreateArticle = timestampSlice.length <
			configuration.interactions.articles.create.maximum ||
		timestampSlice.some((timestamp) =>
			(Date.now() - timestamp) >=
				configuration.interactions.articles.create.interval
		);

	if (!canCreateArticle) {
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

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id,
	);
	if (!author) return showArticleSubmissionFailure(interaction);

	const articles = await client.database.getArticles(
		'language',
		client.getLanguage(interaction.guild!),
	);
	if (!articles) return showArticleSubmissionFailure(interaction);

	const [submission, content] = await openArticleEditor(
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
		content: content,
	};

	submission.respond({
		ephemeral: true,
		embeds: [{
			title: 'Submission received.',
			description:
				`Your article, \`${article.content.title}\`, is awaiting verification.`,
			color: configuration.interactions.responses.colors.yellow,
		}],
	});

	const [isAccepted, by] = await createVerificationPrompt(
		client,
		submission.guild!,
		{
			title: content.title,
			fields: [
				{ name: 'Body', value: content.body },
				...(!content.footer ? [] : [{
					name: 'Footer',
					value: content.footer.length >= 300
						? `${content.footer.slice(0, 297)}...`
						: content.footer,
				}]),
			],
		},
	);

	messageUser(
		interaction.user!,
		interaction.guild!,
		isAccepted
			? {
				title: '🥳 Your article creation request has been accepted.',
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

	const document = await client.database.createArticle(article);
	if (!document) return showArticleSubmissionFailure(submission);

	client.logging.get(submission.guild!.id)?.log(
		'articleCreate',
		document.data,
		submission.member!,
	);
}

export { createArticle };
