import {
	_,
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	Interaction,
	InteractionResponseType,
} from '../../../../deps.ts';
import { Availability } from '../../../commands/structs/availability.ts';
import { Command } from '../../../commands/structs/command.ts';
import configuration from '../../../configuration.ts';
import { ArticleChange } from '../../../database/structs/articles/article-change.ts';
import {
	Article,
	getMostRecentArticleContent,
} from '../../../database/structs/articles/article.ts';
import { Document } from '../../../database/structs/document.ts';
import { User } from '../../../database/structs/users/user.ts';
import { mention, MentionType } from '../../../formatting.ts';
import { paginate } from '../../../utils.ts';
import { createArticle } from './article/create.ts';
import { editArticle } from './article/edit.ts';
import { viewArticle } from './article/view.ts';

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
export { showArticle, showResults };
