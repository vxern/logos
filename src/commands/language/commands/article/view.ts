import {
	_,
	ApplicationCommandFlags,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
} from '../../../../../deps.ts';
import { Client, getLanguage } from '../../../../client.ts';
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
	const language = getLanguage(client, interaction.guildId!);

	function showArticleViewFailure(): void {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to view article',
						description: `Failed to view article.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
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

	const data = interaction.data;
	if (!data) return;

	const dialectOption = data.options?.at(0)?.options?.find((
		option,
	) => option.name === 'dialect');
	if (!dialectOption) return;

	const dialectIndexString = <string | undefined> dialectOption.value;
	if (!dialectIndexString) return;

	const dialectIndex = Number(dialectIndexString);
	if (isNaN(dialectIndex)) return;

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

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		if (dialectOption.focused) {
			const parameter = (<string | undefined> dialectOption.value)
				?.toLowerCase();
			if (!parameter) return;

			const selectedDialects = dialects?.map<[string, number]>((
				dialect,
				index,
			) => [dialect, index]).filter(([dialect, _index]) =>
				dialect.toLowerCase().includes(parameter)
			);

			return void sendInteractionResponse(
				client.bot,
				interaction.id,
				interaction.token,
				{
					type: InteractionResponseTypes.ApplicationCommandAutocompleteResult,
					data: {
						choices: !selectedDialects ? [] : [
							...selectedDialects.map(([dialect, index]) => ({
								name: dialect,
								value: index.toString(),
							})),
							{ name: 'None', value: '-1' },
						],
					},
				},
			);
		}

		return showResults({
			interaction: interaction,
			articlesWrapped: documentsWrapped.map((documentWrapped) => ({
				article: documentWrapped.document.data,
				displayDialect: documentWrapped.displayDialect,
			})),
		});
	}

	const indexString = <string | undefined> data.options?.at(0)?.options?.find((
		option,
	) => option.name === 'title')?.value;
	if (!indexString) return;

	const index = parseInt(indexString);
	if (isNaN(index)) return;

	const show =
		(<boolean | undefined> data.options?.at(0)?.options?.find((option) =>
			option.name === 'show'
		)?.value) ?? false;

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
