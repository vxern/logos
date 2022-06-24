import {
	_,
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import {
	getMostRecentArticleContent,
} from '../../../../database/structs/articles/article.ts';
import { createVerificationPrompt, messageUser } from '../../../../utils.ts';
import { openArticleEditor, showResults } from '../article.ts';

/** Allows the user to edit an existing article. */
async function editArticle(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const language = client.getLanguage(interaction.guild!);

	function showArticleEditFailure(interaction: Interaction): void {
		interaction.respond({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			ephemeral: true,
			embeds: [{
				title: 'Failed to update article',
				description: `Failed to edit article..`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	const documentsUnprocessed = await client.database.getArticles(
		'language',
		language,
	);
	if (!documentsUnprocessed) return showArticleEditFailure(interaction);

	const documents = await client.database.processArticles(documentsUnprocessed);
	if (!documents) return showArticleEditFailure(interaction);

	if (interaction.isAutocomplete()) {
		return showResults({
			interaction: interaction,
			documents: documents,
		});
	}

	const user = await client.database.getOrCreateUser('id', interaction.user.id);
	if (!user) return showArticleEditFailure(interaction);

	const articleChanges = await client.database.getArticleChanges(
		'author',
		user.ref,
	);
	if (!articleChanges) return showArticleEditFailure(interaction);

	const articleTimestamps = articleChanges
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.

	const timestampSlice = articleTimestamps.slice(
		0,
		configuration.interactions.articles.edit.maximum,
	);

	const canEditArticle =
		timestampSlice.length < configuration.interactions.articles.edit.maximum ||
		timestampSlice.some((timestamp) =>
			(Date.now() - timestamp) >=
				configuration.interactions.articles.edit.interval
		);

	if (!canEditArticle) {
		interaction.respond({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			ephemeral: true,
			embeds: [{
				title: 'Maximum number of edits reached',
				description: `You must wait before trying to edit another article.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
		return;
	}

	const data = interaction.data as InteractionApplicationCommandData;
	const index = parseInt(data.options[0]!.options![0]!.value!);
	const document = documents[index]!;

	const changes = await client.database.getArticleChanges(
		'articleReference',
		document.ref,
	);
	if (!changes) return showArticleEditFailure(interaction);

	const content = getMostRecentArticleContent({
		article: document.data,
		changes: changes,
	});

	const [submission, newContent] = await openArticleEditor(
		client,
		interaction,
		content,
	);

	submission.respond({
		ephemeral: true,
		embeds: [{
			title: 'Edit received.',
			description:
				`Your article edit has been received and is awaiting verification.`,
			color: configuration.interactions.responses.colors.yellow,
		}],
	});

	const [isAccepted, by] = await createVerificationPrompt(
		client,
		submission.guild!,
		{
			title: newContent.title,
			fields: [
				{ name: 'Body', value: newContent.body },
				...(!newContent.footer ? [] : [{
					name: 'Footer',
					value: newContent.footer.length >= 300
						? `${newContent.footer.slice(0, 297)}...`
						: newContent.footer,
				}]),
			],
		},
	);

	messageUser(
		interaction.user!,
		interaction.guild!,
		isAccepted
			? {
				title: '🥳 Your article edit has been applied.',
				description: `Your edit is now featured.`,
				color: configuration.interactions.responses.colors.green,
			}
			: {
				title: '😔 Unfortunately, your article edit has been rejected.',
				description:
					'This is likely because the edit was inappropriate or incorrect.',
				color: configuration.interactions.responses.colors.red,
			},
	);

	const articleChange = {
		author: user.ref,
		article: document.ref,
		content: newContent,
	};

	client.logging.get(submission.guild!.id)?.log(
		isAccepted ? 'articleEditAccept' : 'articleEditReject',
		document.data,
		articleChange,
		by,
	);

	if (!isAccepted) return;

	const change = await client.database.changeArticle(articleChange);
	if (!change) return showArticleEditFailure(submission);

	client.logging.get(submission.guild!.id)?.log(
		'articleEdit',
		document.data,
		change.data,
		submission.member!,
	);
}

export { editArticle };
