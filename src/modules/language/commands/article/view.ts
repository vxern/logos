import {
	_,
	Interaction,
	InteractionApplicationCommandData,
	InteractionResponseType,
} from '../../../../../deps.ts';
import { Client } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import {
	Article,
	getContributorReferences,
} from '../../../../database/structs/articles/article.ts';
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
			ephemeral: true,
			embeds: [{
				title: 'Failed to view article',
				description: `Failed to view article.`,
				color: configuration.interactions.responses.colors.red,
			}],
		});
	}

	const documentsUnprocessed = await client.database.getArticles(
		'language',
		language,
	);
	if (!documentsUnprocessed) return showArticleViewFailure();

	const documents = await client.database.processArticles(
		documentsUnprocessed,
	);
	if (!documents) return showArticleViewFailure();

	const dialects = <
		| string[]
		| undefined
	> (<Record<string, Record<string, unknown>>> configuration.guilds
		.languages)[language]?.dialects;

	const data = <InteractionApplicationCommandData> interaction.data;
	const dialectIndex = data.options[0]?.options?.find((option) =>
		option.name === 'dialect'
	)?.value;
	const dialect = !dialects ? undefined : dialects[dialectIndex];

	const documentsFiltered = !dialect
		? documents
		: documents.filter((document) => document.data.dialect === dialect);

	const documentsWrapped: {
		document: Document<Article>;
		displayDialect: boolean;
	}[] = documentsFiltered
		.map<[Document<Article>, string]>((
			document,
		) => [document, document.data.content.title])
		.map(([document, title], _index, tuples) => {
			const titles = tuples.map(([_document, title]) => title);

			const isUnique = titles.findIndex((_title) =>
				_title === title
			)! === titles.findLastIndex((_title) => _title === title)!;

			return { document: document, displayDialect: !isUnique };
		});

	if (interaction.isAutocomplete()) {
		if (interaction.focusedOption.name === 'dialect') {
			const argument = (<string> interaction.focusedOption.value!)
				.toLowerCase();

			const selectedDialects = dialects?.map<[string, number]>((
				dialect,
				index,
			) => [dialect, index]).filter(([dialect, _index]) =>
				dialect.toLowerCase().includes(argument)
			);

			interaction.respond({
				type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
				choices: !selectedDialects ? [] : [
					...selectedDialects.map(([dialect, index]) => ({
						name: dialect,
						value: index.toString(),
					})),
					{ name: 'None', value: '-1' },
				],
			});
			return;
		}

		return showResults({
			interaction: interaction,
			articlesWrapped: documentsWrapped.map((documentWrapped) => ({
				article: documentWrapped.document.data,
				displayDialect: documentWrapped.displayDialect,
			})),
		});
	}

	const index = parseInt(
		data.options[0]!.options!.find((option) => option.name === 'title')!.value!,
	);
	const show =
		data.options[0]!.options!.find((option) => option.name === 'show')?.value ??
			false;
	const document = documentsFiltered[index];
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
		contributors: <Document<User>[]> contributors,
		show: show,
	});
}

export { viewArticle };
