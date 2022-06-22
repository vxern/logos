import {
	_,
	Interaction,
	InteractionApplicationCommandData,
	InteractionModalSubmitData,
	InteractionResponseType,
	InteractionType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import {
	getMostRecentArticleContent,
} from '../../../../database/structs/articles/article.ts';
import {
	createInteractionCollector,
	Form,
	toModal,
} from '../../../../utils.ts';
import { showResults } from '../article.ts';

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

	const prefilledForm = _.merge(
		_.cloneDeep(configuration.interactions.forms.article),
		{
			fields: Object.fromEntries(
				Object.entries(content).map((
					[field, value],
				) => [field, { value: value }]),
			),
		},
	) as Form;

	const [collector, customID] = createInteractionCollector(client, {
		type: InteractionType.MODAL_SUBMIT,
		user: interaction.user,
	});

	interaction.showModal(
		toModal(prefilledForm, customID),
	);

	const submission = (await collector.waitFor('collect'))[0] as Interaction;
	const modalData = submission.data! as InteractionModalSubmitData;
	const components = modalData.components;

	const change = await client.database.changeArticle({
		author: user.ref,
		article: document.ref,
		content: {
			title: components[0]!.components[0]!.value!,
			body: components[1]!.components[0]!.value!,
			footer: components[2]!.components[0]!.value,
		},
	});
	if (!change) return showArticleEditFailure(submission);

	client.logging.get(interaction.guild!.id)?.log(
		'articleEdit',
		document.data,
		change.data,
		submission.member!,
	);

	submission.respond({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		ephemeral: true,
		embeds: [{
			title: 'Article edited successfully!',
			description: `Your edit was saved.`,
			color: configuration.interactions.responses.colors.green,
		}],
	});
}

export { editArticle };
