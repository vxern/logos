import {
	_,
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import { getContributorReferences } from '../../../../database/structs/articles/article.ts';
import { Document } from '../../../../database/structs/document.ts';
import { User } from '../../../../database/structs/users/user.ts';
import { showArticle, showResults } from '../article.ts';

/** Displays an available article to the user. */
async function viewArticle(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const language = client.getLanguage(interaction.guild!);

	function showArticleViewFailure(): void {
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
	if (!documentsUnprocessed) return showArticleViewFailure();

	const documents = await client.database.processArticles(documentsUnprocessed);
	if (!documents) return showArticleViewFailure();

	if (interaction.isAutocomplete()) {
		return showResults({
			interaction: interaction,
			documents: documents,
		});
	}

	const data = interaction.data as InteractionApplicationCommandData;
	const index = parseInt(data.options[0]!.options![0]!.value!);
	const show =
		data.options[0]!.options!.find((option) => option.name === 'show')?.value ??
			false;
	const document = documents[index];
	if (!document) return showArticleViewFailure();

	const changes = await client.database.getArticleChanges(
		'articleReference',
		document.ref,
	);
	if (!changes) return showArticleViewFailure();

	const contributorReferences = getContributorReferences({
		article: document.data,
		changes: changes,
	});
	const contributors = await Promise.all(
		contributorReferences.map((reference) =>
			client.database.getOrCreateUser('reference', reference)
		),
	);
	if (contributors.includes(undefined)) return showArticleViewFailure();

	return showArticle({
		interaction: interaction,
		document: document,
		changes: changes,
		contributors: contributors as Document<User>[],
		show: show,
	});
}

export { viewArticle };
