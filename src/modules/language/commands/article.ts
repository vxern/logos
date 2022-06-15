import {
	_,
	AutocompleteInteraction,
	Collector,
	Interaction,
	InteractionApplicationCommandData,
	InteractionModalSubmitData,
	InteractionResponseType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/availability.ts';
import { Command } from '../../../commands/command.ts';
import { OptionType } from '../../../commands/option.ts';
import configuration from '../../../configuration.ts';
import { ArticleChange } from '../../../database/structs/articles/article-change.ts';
import {
	Article,
	getContributorReferences,
	getMostRecentArticleContent,
} from '../../../database/structs/articles/article.ts';
import { Document } from '../../../database/structs/document.ts';
import { User } from '../../../database/structs/users/user.ts';
import { mention, MentionType } from '../../../formatting.ts';
import { Form, paginate, toModal } from '../../../utils.ts';

const command: Command = {
	name: 'article',
	availability: Availability.MEMBERS,
	options: [{
		name: 'create',
		type: OptionType.SUB_COMMAND,
		handle: create,
	}, {
		name: 'edit',
		type: OptionType.SUB_COMMAND,
		options: [{
			name: 'title',
			type: OptionType.STRING,
			required: true,
			autocomplete: true,
		}],
		handle: edit,
	}, {
		name: 'view',
		type: OptionType.SUB_COMMAND,
		options: [{
			name: 'title',
			type: OptionType.STRING,
			required: true,
			autocomplete: true,
		}, {
			name: 'show',
			type: OptionType.BOOLEAN,
			required: false,
		}],
		handle: view,
	}],
};

/** Allows the user to write and submit an article. */
async function create(client: Client, interaction: Interaction): Promise<void> {
	const user = await client.database.getOrCreateUser('id', interaction.user.id);

	if (!user) return;

	const articles = await client.database.getArticles('author', user.ref);

	if (!articles) return;

	const articleTimestamps = articles
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.

	const timestampSlice = articleTimestamps.slice(
		0,
		configuration.guilds.articles.create.maximum,
	);

	const canCreateArticle =
		timestampSlice.length < configuration.guilds.articles.create.maximum ||
		timestampSlice.some((timestamp) =>
			(Date.now() - timestamp) >= configuration.guilds.articles.create.interval
		);

	if (!canCreateArticle) {
		interaction.respond({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			ephemeral: true,
			embeds: [{
				title: 'Maximum number of articles reached',
				description: `You must wait before submitting another article.`,
				color: configuration.responses.colors.red,
			}],
		});
		return;
	}

	interaction.showModal(toModal(configuration.forms.article));

	const collector = new Collector({
		event: 'interactionCreate',
		client: interaction.client,
		filter: (selection: Interaction) => {
			if (!selection.isModalSubmit()) return false;

			if (selection.user.id !== interaction.user.id) return false;

			if (selection.data.custom_id !== 'article_editor') return false;

			return true;
		},
		deinitOnEnd: true,
	});

	collector.collect();

	const submission = (await collector.waitFor('collect'))[0] as Interaction;

	collector.end();

	const data = submission.data! as InteractionModalSubmitData;
	const components = data.components;

	function showArticleSubmissionFailure(): void {
		submission.respond({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			ephemeral: true,
			embeds: [{
				title: 'Failed to submit article',
				description: `Your article failed to be submitted.`,
				color: configuration.responses.colors.red,
			}],
		});
	}

	const author = await client.database.getOrCreateUser(
		'id',
		submission.user.id,
	);

	if (!author) {
		return showArticleSubmissionFailure();
	}

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

	if (!document) {
		return showArticleSubmissionFailure();
	}

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
			color: configuration.responses.colors.green,
		}],
	});
}

/** Allows the user to edit an existing article. */
async function edit(client: Client, interaction: Interaction): Promise<void> {
	const language = client.getLanguage(interaction.guild!);
	const documents = await client.database.getArticles('language', language);

	if (!documents) {
		return;
	}

	const articles = documents.map((document) => document.data);

	if (interaction.isAutocomplete()) {
		return showResults({
			interaction: interaction,
			articles: articles,
		});
	}

	const user = await client.database.getOrCreateUser('id', interaction.user.id);

	if (!user) return;

	const articleChanges = await client.database.getArticleChanges(
		'author',
		user.ref,
	);

	if (!articleChanges) return;

	const articleTimestamps = articleChanges
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.

	const timestampSlice = articleTimestamps.slice(
		0,
		configuration.guilds.articles.edit.maximum,
	);

	const canCreateArticleChange =
		timestampSlice.length < configuration.guilds.articles.edit.maximum ||
		timestampSlice.some((timestamp) =>
			(Date.now() - timestamp) >= configuration.guilds.articles.edit.interval
		);

	if (!canCreateArticleChange) {
		interaction.respond({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			ephemeral: true,
			embeds: [{
				title: 'Maximum number of edits reached',
				description: `You must wait before trying to edit another article.`,
				color: configuration.responses.colors.red,
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

	if (!changes) {
		return;
	}

	const content = getMostRecentArticleContent({
		article: document.data,
		changes: changes,
	});

	const prefilledForm = _.merge(
		configuration.forms.article,
		{
			fields: Object.fromEntries(
				Object.entries(content).map(([field, value]) => {
					return [field, { value: value }];
				}),
			),
		},
	) as Form;

	interaction.showModal(toModal(prefilledForm));

	const collector = new Collector({
		event: 'interactionCreate',
		client: interaction.client,
		filter: (selection: Interaction) => {
			if (!selection.isModalSubmit()) return false;

			if (selection.user.id !== interaction.user.id) return false;

			if (selection.data.custom_id !== 'article_editor') return false;

			return true;
		},
		deinitOnEnd: true,
	});

	collector.collect();

	const submission = (await collector.waitFor('collect'))[0] as Interaction;

	collector.end();

	function showArticleEditFailure(): void {
		submission.respond({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			ephemeral: true,
			embeds: [{
				title: 'Failed to update article',
				description: `Failed to edit article..`,
				color: configuration.responses.colors.red,
			}],
		});
	}

	if (!user) {
		return showArticleEditFailure();
	}

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

	if (!change) {
		return showArticleEditFailure();
	}

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
			color: configuration.responses.colors.green,
		}],
	});
}

/** Displays an available article to the user. */
async function view(client: Client, interaction: Interaction): Promise<void> {
	const language = client.getLanguage(interaction.guild!);
	const documentsUnprocessed = await client.database.getArticles(
		'language',
		language,
	);

	if (!documentsUnprocessed) {
		return;
	}

	if (interaction.isAutocomplete()) {
		const articles = documentsUnprocessed.map((document) => document.data);

		return showResults({
			interaction: interaction,
			articles: articles,
		});
	}

	const documentsChanges = await Promise.all(
		documentsUnprocessed.map((document) =>
			new Promise<[Document<Article>, Document<ArticleChange>[] | undefined]>((
				resolve,
			) =>
				client.database.getArticleChanges(
					'articleReference',
					document.ref,
				)
					.then((changes) => {
						resolve([document, changes]);
					})
			)
		),
	);

	if (
		documentsChanges.map(([_document, change]) => change).includes(undefined)
	) {
		return;
	}

	const documents = documentsChanges.map(([document, changes]) => {
		document.data.content = getMostRecentArticleContent({
			article: document.data,
			changes: changes!,
		});

		return document;
	});

	const data = interaction.data as InteractionApplicationCommandData;
	const index = parseInt(data.options[0]!.options![0]!.value!);
	const show =
		data.options[0]!.options!.find((option) => option.name === 'show')?.value ??
			false;
	const document = documents[index];

	if (!document) {
		return;
	}

	const changes = await client.database.getArticleChanges(
		'articleReference',
		document.ref,
	);

	if (!changes) {
		return;
	}

	const contributorReferences = getContributorReferences({
		article: document.data,
		changes: changes,
	});

	const contributors = await Promise.all(
		contributorReferences.map((reference) =>
			client.database.getOrCreateUser('reference', reference)
		),
	);

	if (contributors.includes(undefined)) {
		return;
	}

	return showArticle({
		interaction: interaction,
		document: document,
		changes: changes,
		contributors: contributors as Document<User>[],
		show: show,
	});
}

function showResults(
	{ interaction, articles }: {
		interaction: AutocompleteInteraction;
		articles: Article[];
	},
): void {
	const argument = interaction.data!.options[0]!.options!.find((option) =>
		option.focused
	)!;

	const value = argument.value as string;
	const articlesByName = articles.filter((article) =>
		article.content.title.toLowerCase().includes(value.toLowerCase())
	);

	interaction.respond({
		type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
		choices: articlesByName.map((article, index) => {
			return {
				name: article.content.title,
				value: index.toString(),
			};
		}),
	});
}

function showArticle({
	interaction,
	document,
	changes,
	contributors,
	show,
}: {
	interaction: Interaction;
	document: Document<Article>;
	changes: Document<ArticleChange>[];
	contributors: Document<User>[];
	show: boolean;
}): void {
	const contributorsString = contributors.map((document) =>
		mention(document.data.account.id, MentionType.USER)
	).join(', ');

	const content = getMostRecentArticleContent({
		article: document.data,
		changes: changes,
	});

	const sections = content.body.split('\n\n');

	const pages = sections.reduce<string[]>(
		(accumulated, section) => {
			const last = accumulated[accumulated.length - 1] ?? '';

			const pendingLength = last.length + section.length;
			const maximumLength = 1024 - 2 * (accumulated.length - 1);

			if (
				pendingLength < maximumLength && section[section.length - 1] !== ':'
			) {
				const lastIndex = Math.max(0, accumulated.length - 1);

				accumulated[lastIndex] = last.length === 0
					? section
					: `${last}\n\n${section}`;
			} else {
				accumulated.push(section);
			}

			return accumulated;
		},
		[],
	);

	paginate({
		interaction: interaction,
		elements: pages,
		embed: {
			title: content.title,
			description: `
Contributors: ${contributorsString}`,
			color: configuration.responses.colors.blue,
		},
		view: {
			title: 'Answer',
			generate: (page) => page,
		},
		show: show,
	});
}

export default command;
