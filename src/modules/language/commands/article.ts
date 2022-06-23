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
	MessageComponentType,
} from '../../../../deps.ts';
import { Client } from '../../../client.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { ArticleChange } from '../../../database/structs/articles/article-change.ts';
import {
	Article,
	ArticleTextContent,
	getMostRecentArticleContent,
} from '../../../database/structs/articles/article.ts';
import { Document } from '../../../database/structs/document.ts';
import { User } from '../../../database/structs/users/user.ts';
import { mention, MentionType } from '../../../formatting.ts';
import {
	createInteractionCollector,
	paginate,
	toModal,
} from '../../../utils.ts';
import { createArticle } from './article/create.ts';
import { editArticle } from './article/edit.ts';
import { viewArticle } from './article/view.ts';

const newlineOverflow = new RegExp(
	`\n{${configuration.interactions.articles.restrictions.newlines.consecutive},}`,
);

const command: Command = {
	name: 'article',
	availability: Availability.MEMBERS,
	options: [{
		name: 'create',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		handle: createArticle,
	}, {
		name: 'edit',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [{
			name: 'title',
			type: ApplicationCommandOptionType.STRING,
			required: true,
			autocomplete: true,
		}],
		handle: editArticle,
	}, {
		name: 'view',
		type: ApplicationCommandOptionType.SUB_COMMAND,
		options: [{
			name: 'title',
			type: ApplicationCommandOptionType.STRING,
			required: true,
			autocomplete: true,
		}, {
			name: 'show',
			type: ApplicationCommandOptionType.BOOLEAN,
			required: false,
		}],
		handle: viewArticle,
	}],
};

/** Opens the article editor, allowing the user to create or edit an article. */
async function openArticleEditor(
	client: Client,
	interaction: Interaction,
	initial?: ArticleTextContent,
): Promise<[ModalSubmitInteraction, ArticleTextContent]> {
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

	let hasProvidedIncorrectData = false;

	let awarenessCollector!: Collector;
	let awarenessCustomID!: string;

	function createAwarenessCollector(): void {
		[awarenessCollector, awarenessCustomID] = createInteractionCollector(
			client,
			{
				type: InteractionType.MESSAGE_COMPONENT,
				user: modalAnchor.user,
			},
		);
	}

	let modalAnchor = interaction;

	let submission!: ModalSubmitInteraction;
	while (!isEnded()) {
		if (hasProvidedIncorrectData) {
			// deno-lint-ignore no-await-in-loop
			modalAnchor = (await awarenessCollector.waitFor('collect'))[0];
		}

		createAwarenessCollector();

		const formView = _.merge(
			_.cloneDeep(configuration.interactions.forms.article),
			{
				fields: {
					title: { value: content.title },
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
		content.footer = components[2]?.components[0]?.value;

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

		const newlineProportions = (Object.entries(content) as [
			keyof ArticleTextContent,
			string | undefined,
		][]).map<
			[keyof ArticleTextContent, number | undefined]
		>(([field, content]) => [field, getProportionOfNewlines(content)]);

		const newlineProportionBreach = newlineProportions.find((
			[field, proportion],
		) =>
			proportion && proportion >
				configuration.interactions.articles.restrictions
					.newlines[field as 'body' | 'footer']!
		);

		if (newlineProportionBreach) {
			const [field, _proportion] = newlineProportionBreach;

			hasProvidedIncorrectData = true;
			showArticleEditFailure(
				submission,
				`Your article ${field} contains too many newlines. The maximum is ${
					configuration.interactions.articles.restrictions
						.newlines[field as 'body' | 'footer'] * 100
				}% per article ${field}.`,
				true,
				awarenessCustomID,
			);
			continue;
		}

		const newlineOverflowBreach = (Object.entries(content) as [
			keyof ArticleTextContent,
			string | undefined,
		][]).find((
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

		const lengthBreach = (Object.entries(content) as [
			keyof ArticleTextContent,
			string | undefined,
		][]).find((
			[_field, content],
		) =>
			content &&
			content.split('\n\n').some((paragraph) =>
				paragraph.length >
					configuration.interactions.articles.restrictions.paragraphLength
			)
		);

		if (lengthBreach) {
			const [field, _content] = lengthBreach;

			hasProvidedIncorrectData = true;
			showArticleEditFailure(
				submission,
				`Your article ${field} contains too many consecutive newlines. There can only be ${configuration.interactions.articles.restrictions.newlines.consecutive} consecutive newlines.`,
				true,
				awarenessCustomID,
			);
			continue;
		}

    

		collector.end();

		if (!hasProvidedIncorrectData) {
			awarenessCollector.end();
		}
	}

	return [submission, content];
}

function showResults(
	{ interaction, documents }: {
		interaction: AutocompleteInteraction;
		documents: Document<Article>[];
	},
): void {
	const argument = interaction.data!.options[0]!.options!.find((option) =>
		option.focused
	)!;

	const value = argument.value as string;
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
			color: configuration.interactions.responses.colors.blue,
		},
		view: {
			title: 'Answer',
			generate: (page) => page,
		},
		show: show,
	});
}

export default command;
export { openArticleEditor, showArticle, showResults };
