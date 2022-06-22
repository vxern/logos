import {
	_,
	Interaction,
	InteractionModalSubmitData,
	InteractionResponseType,
	InteractionType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { Article } from '../../../../database/structs/articles/article.ts';
import { createInteractionCollector, toModal } from '../../../../utils.ts';

/** Allows the user to write and submit an article. */
async function createArticle(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	function showArticleSubmissionFailure(interaction: Interaction): void {
		interaction.respond({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
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
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			ephemeral: true,
			embeds: [{
				title: 'Maximum number of articles reached',
				description: `You must wait before submitting another article.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	const [collector, customID] = createInteractionCollector(client, {
		type: InteractionType.MODAL_SUBMIT,
		user: interaction.user,
	});

	interaction.showModal(
		toModal(configuration.interactions.forms.article, customID),
	);

	const submission = (await collector.waitFor('collect'))[0] as Interaction;
	const data = submission.data! as InteractionModalSubmitData;
	const components = data.components;

	const author = await client.database.getOrCreateUser(
		'id',
		submission.user.id,
	);
	if (!author) return showArticleSubmissionFailure(submission);

	const footer = components[2]?.components[0]?.value;
	const article: Article = {
		author: author.ref,
		language: client.getLanguage(submission.guild!),
		content: {
			title: components[0]!.components[0]!.value!,
			body: components[1]!.components[0]!.value!,
			footer: (footer && footer.length !== 0) ? footer : undefined,
		},
	};

	const document = await client.database.createArticle(article);
	if (!document) return showArticleSubmissionFailure(submission);

	client.logging.get(interaction.guild!.id)?.log(
		'articleSubmit',
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
