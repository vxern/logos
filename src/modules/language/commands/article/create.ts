import {
	_,
	Interaction,
	InteractionResponseType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { Article } from '../../../../database/structs/articles/article.ts';
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

	const articles = await client.database.getArticles('author', user.ref);
	if (!articles) return showArticleSubmissionFailure(interaction);

	const articleTimestamps = articles
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

	const [submission, content] = await openArticleEditor(client, interaction);
	if (!content) return showArticleSubmissionFailure(submission);

	const article: Article = {
		author: author.ref,
		language: client.getLanguage(submission.guild!),
		content: content,
	};

	const document = await client.database.createArticle(article);
	if (!document) return showArticleSubmissionFailure(submission);

	client.logging.get(submission.guild!.id)?.log(
		'articleCreate',
		document.data,
		submission.member!,
	);

	submission.respond({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		ephemeral: true,
		embeds: [{
			title: 'Article submitted successfully!',
			description:
				`Your article, \`${document.data.content.title}\`, has been submitted successfully.`,
			color: configuration.interactions.responses.colors.green,
		}],
	});
}

export { createArticle };
