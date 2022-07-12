import { ModalSubmitInteraction } from 'https://raw.githubusercontent.com/vxern/harmony/main/src/structures/modalSubmitInteraction.ts';
import {
	_,
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	ButtonStyle,
	Collector,
	Interaction,
	InteractionResponseType,
	InteractionType,
	Member,
	MessageComponentInteraction,
	MessageComponentType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { CommandBuilder } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { ArticleChange } from '../../../database/structs/articles/article-change.ts';
import {
	Article,
	ArticleTextContent,
	getMostRecentArticleContent,
} from '../../../database/structs/articles/article.ts';
import { Document } from '../../../database/structs/document.ts';
import { User } from '../../../database/structs/users/user.ts';
import { list, mention } from '../../../formatting.ts';
import {
	createInteractionCollector,
	Form,
	paginate,
	toModal,
} from '../../../utils.ts';
import { createArticle } from './article/create.ts';
import { editArticle } from './article/edit.ts';
import { viewArticle } from './article/view.ts';

const newlineOverflow = new RegExp(
	`\n{${
		configuration.interactions.articles.restrictions.newlines.consecutive + 1
	},}`,
);

const command: CommandBuilder = (language) => ({
	name: 'article',
	availability: Availability.MEMBERS,
	description: 'Allows the user to interact with the server articles.',
	options: [{
		name: 'create',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		description: 'Submit a new article.',
		handle: createArticle,
	}, {
		name: 'edit',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		description: 'Edit an existing article.',
		options: [{
			name: 'title',
			type: ApplicationCommandOptionType.STRING,
			description: 'The title of the article.',
			required: true,
			autocomplete: true,
		}],
		handle: editArticle,
	}, {
		name: 'view',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		description: 'View one of the available articles.',
		options: [
			...(() => {
				const dialects = <
					| string[]
					| undefined
				> (<Record<string, Record<string, unknown>>> configuration.guilds
					.languages)[language]?.dialects;

				if (!dialects || dialects.length === 0) return [];

				return [{
					name: 'dialect',
					type: ApplicationCommandOptionType.STRING,
					description:
						'The dialect of the language the article has been written for.',
					required: true,
					autocomplete: true,
				}];
			})(),
			{
				name: 'title',
				type: ApplicationCommandOptionType.STRING,
				description: 'The title of the article.',
				required: true,
				autocomplete: true,
			},
			{
				name: 'show',
				type: ApplicationCommandOptionType.BOOLEAN,
				description:
					'If set to true, the article will be shown to other users.',
				required: false,
			},
		],
		handle: viewArticle,
	}],
});

/** Opens the article editor, allowing the user to create or edit an article. */
async function openArticleEditor(
	client: Client,
	interaction: Interaction,
	initial?: ArticleTextContent,
	articles?: Article[],
): Promise<[Interaction, ArticleTextContent, string | undefined]> {
	function showArticleEditFailure(
		interaction: Interaction,
		message?: string,
		showOkayButton?: boolean,
		customID?: string,
	): void {
		interaction.respond({
			ephemeral: true,
			embeds: [{
				title: 'Failed to submit article',
				description: message ?? `Your article failed to be submitted.`,
				color: configuration.interactions.responses.colors.red,
			}],
			...(!showOkayButton ? {} : {
				components: [{
					type: MessageComponentType.ACTION_ROW,
					components: [{
						type: MessageComponentType.BUTTON,
						style: ButtonStyle.BLURPLE,
						label: 'Okay',
						customID: customID!,
					}],
				}],
			}),
		});
	}

	const [collector, customID, isEnded] = createInteractionCollector(client, {
		type: InteractionType.MODAL_SUBMIT,
		user: interaction.user,
		endless: true,
	});

	function getProportionOfNewlines(target?: string): number | undefined {
		if (!target) return undefined;

		const newlines = Math.max(0, target.split('\n').length - 1);

		return newlines / target.length;
	}

	const content: ArticleTextContent = initial ? _.clone(initial) : {};
	let selectedDialect: string | undefined = undefined;

	let hasProvidedIncorrectData = false;

	let awarenessCollector!: Collector;
	let awarenessCustomID!: string;

	function createAwarenessCollector(): void {
		[awarenessCollector, awarenessCustomID] = createInteractionCollector(
			client,
			{
				type: InteractionType.MESSAGE_COMPONENT,
				user: modalAnchor.user,
				endless: true,
				limit: 1,
			},
		);
	}

	const language = client.getLanguage(interaction.guild!);

	const dialects = <
		| string[]
		| undefined
	> (<Record<string, Record<string, unknown>>> configuration.guilds
		.languages)[language]?.dialects;

	let modalAnchor = interaction;

	let overrideInteraction: Interaction | undefined = undefined;
	let submission!: ModalSubmitInteraction;
	while (!isEnded()) {
		if (hasProvidedIncorrectData) {
			// deno-lint-ignore no-await-in-loop
			modalAnchor = (await awarenessCollector.waitFor('collect'))[0];
		}

		createAwarenessCollector();

		const formView = <Form> _.merge(
			_.cloneDeep(configuration.interactions.forms.article),
			{
				fields: {
					title: { value: content.title },
					...(!!initial || !dialects || dialects.length === 0 ? {} : {
						language: {
							type: 'SELECT',
							label: 'Dialect (leave empty if irrelevant)',
							minimum: 0,
							maximum: 1,
							options: [
								...dialects.map((dialect, index) => ({
									label: dialect,
									value: index.toString(),
									default: dialect === selectedDialect,
								})),
								{
									label: 'None',
									value: '-1',
								},
							],
						},
					}),
					body: { value: content.body },
					footer: { value: content.footer },
				},
			},
		);

		modalAnchor.showModal(toModal(formView, customID));

		// deno-lint-ignore no-await-in-loop
		submission = (await collector.waitFor('collect'))[0];
		const components = submission.data!.components;

		content.title = components[0]!.components[0]!.value!;
		content.body = components[1]!.components[0]!.value!;
		const footer = components[2]!.components[0]!.value!;
		content.footer = footer.length === 0 ? undefined : footer;
		const dialectIndex =
			(<Record<string, string>> (<unknown> components[3]!.components[0]!))
				.values![0];
		selectedDialect = !dialectIndex
			? undefined
			: dialects![Number(dialectIndex)];

		if (content.title.includes('\n')) {
			hasProvidedIncorrectData = true;
			showArticleEditFailure(
				submission,
				'Title cannot contain newlines.',
				true,
				awarenessCustomID,
			);
			continue;
		}

		const newlineProportions =
			(<[keyof ArticleTextContent, string | undefined][]> Object.entries(
				content,
			)).map<
				[keyof ArticleTextContent, number | undefined]
			>(([field, content]) => [field, getProportionOfNewlines(content)]);

		const newlineProportionBreach = newlineProportions.find((
			[field, proportion],
		) =>
			proportion && proportion >
				configuration.interactions.articles.restrictions
					.newlines[<'body' | 'footer'> field]!
		);

		if (newlineProportionBreach) {
			const [field, _proportion] = newlineProportionBreach;

			hasProvidedIncorrectData = true;
			showArticleEditFailure(
				submission,
				`Your article ${field} contains too many newlines. The maximum is ${
					configuration.interactions.articles.restrictions
						.newlines[<'body' | 'footer'> field] * 100
				}% per article ${field}.`,
				true,
				awarenessCustomID,
			);
			continue;
		}

		const newlineOverflowBreach =
			(<[keyof ArticleTextContent, string | undefined][]> Object.entries(
				content,
			)).find((
				[_field, content],
			) => content && newlineOverflow.test(content));

		if (newlineOverflowBreach) {
			const [field, _content] = newlineOverflowBreach;

			hasProvidedIncorrectData = true;
			showArticleEditFailure(
				submission,
				`Your article ${field} contains too many consecutive newlines. There can only be ${configuration.interactions.articles.restrictions.newlines.consecutive} consecutive newlines.`,
				true,
				awarenessCustomID,
			);
			continue;
		}

		const lengthBreach =
			(<[keyof ArticleTextContent, string | undefined][]> Object.entries(
				content,
			)).find((
				[_field, content],
			) =>
				content &&
				content.split('\n\n').some((paragraph) =>
					paragraph.length >
						configuration.interactions.articles.restrictions.paragraphLength
				)
			);

		if (lengthBreach) {
			hasProvidedIncorrectData = true;
			showArticleEditFailure(
				submission,
				`The maximum length of an article paragraph is ${configuration.interactions.articles.restrictions.paragraphLength} characters, but one of your paragraphs is longer than that. Try breaking your paragraph into smaller bits.`,
				true,
				awarenessCustomID,
			);
			continue;
		}

		const titleWords = content.title.split(' ');
		const similarArticleTitles = articles?.filter((article) => {
			const articleTitleWords = article.content.title.split(' ');

			const matchingWords = articleTitleWords.reduce((matchingWords, word) => {
				if (titleWords.includes(word)) {
					return matchingWords + 1;
				} else {
					return matchingWords;
				}
			}, 0);

			return (matchingWords / articleTitleWords.length) > 0.4;
		});

		if (similarArticleTitles && similarArticleTitles.length !== 0) {
			const [continueCollector, continueCustomID] = createInteractionCollector(
				client,
				{
					type: InteractionType.MESSAGE_COMPONENT,
					user: modalAnchor.user,
					endless: true,
					limit: 1,
				},
			);

			const [returnCollector, returnCustomID] = createInteractionCollector(
				client,
				{
					type: InteractionType.MESSAGE_COMPONENT,
					user: modalAnchor.user,
					endless: true,
					limit: 1,
				},
			);

			submission.respond({
				ephemeral: true,
				embeds: [{
					title: 'Similar articles exist',
					description:
						`Below is a list of articles with a similar title to yours. Please ensure that an article for your concept does not already exist:

${list(articles!.map((article) => article.content.title))}`,
					color: configuration.interactions.responses.colors.yellow,
				}],
				components: [{
					type: MessageComponentType.ACTION_ROW,
					components: [{
						type: MessageComponentType.BUTTON,
						style: ButtonStyle.GREEN,
						label: 'Continue',
						customID: continueCustomID,
					}, {
						type: MessageComponentType.BUTTON,
						style: ButtonStyle.GREY,
						label: 'Return',
						customID: returnCustomID,
					}],
				}],
			});

			// deno-lint-ignore no-await-in-loop
			const interaction = await Promise.any<MessageComponentInteraction>([
				continueCollector.waitFor('collect').then((collected) => collected[0]),
				returnCollector.waitFor('collect').then((collected) => collected[0]),
			]);

			continueCollector.end();
			returnCollector.end();

			if (interaction.customID === returnCustomID) {
				modalAnchor = interaction;
				continue;
			}

			overrideInteraction = interaction;
		}

		collector.end();

		if (!hasProvidedIncorrectData) {
			awarenessCollector.end();
		}
	}

	return [overrideInteraction ?? submission, content, selectedDialect];
}

function showResults(
	{ interaction, documents }: {
		interaction: AutocompleteInteraction;
		documents: Document<Article>[];
	},
): void {
	const value = <string> interaction.focusedOption.value;
	const articlesByName = documents.map((document) => document.data).filter((
		document,
	) => document.content.title.toLowerCase().includes(value.toLowerCase()));

	interaction.respond({
		type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
		choices: articlesByName.map((article, index) => ({
			name: article.content.title,
			value: index.toString(),
		})),
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
		mention(document.data.account.id, 'USER')
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
			description: `Contributors: ${contributorsString}`,
			color: configuration.interactions.responses.colors.blue,
		},
		view: {
			title: 'Answer',
			generate: (page) => page,
		},
		show: show,
	});
}

/**
 * Taking a member, checks if they're considered to be a contributor by
 * verifying their roles and matching them against the contributor roles.
 *
 * @param member - The member to check.
 * @returns A promise resolving to the value of whether a member is a
 * contributor or not.
 */
async function verifyIsContributor(member: Member): Promise<boolean> {
	const roles = await member.roles.array();
	const roleNames = roles.map((role) => role.name);

	return roleNames.some((roleName) =>
		configuration.interactions.articles.contributors.includes(
			roleName,
		)
	);
}

async function verifyCanAct(
	{ client, user, isContributor, action }: {
		client: Client;
		user: Document<User>;
		action: 'CREATE' | 'EDIT';
		isContributor: boolean;
	},
): Promise<boolean | undefined> {
	const articlesByAuthor = await client.database.getArticles(
		'author',
		user.ref,
	);
	if (!articlesByAuthor) return undefined;

	const articleTimestamps = articlesByAuthor
		.map((document) => document.ts)
		.sort((a, b) => b - a); // From most recent to least recent.
	const maximumNumberOfActions = configuration.interactions
		.articles[<'create' | 'edit'> action.toLowerCase()]
		.maximum[isContributor ? 'contributors' : 'members'];
	const timestampSlice = articleTimestamps.slice(0, maximumNumberOfActions);

	const canAct = timestampSlice.length <
			maximumNumberOfActions ||
		timestampSlice.some((timestamp) =>
			(Date.now() - timestamp) >=
				configuration.interactions.articles.create.interval
		);

	return canAct;
}

export default command;
export {
	openArticleEditor,
	showArticle,
	showResults,
	verifyCanAct,
	verifyIsContributor,
};
