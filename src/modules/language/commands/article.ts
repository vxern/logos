import {
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
import { Article } from '../../../database/structs/article.ts';
import { mention, MentionType, time } from '../../../formatting.ts';
import { paginate, toModal } from '../../../utils.ts';

const command: Command = {
	name: 'article',
	availability: Availability.MEMBERS,
	options: [{
		name: 'create',
		type: OptionType.SUB_COMMAND,
		handle: create,
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

	const author = submission.user!;

	const article: Article = {
		title: components[0]!.components[0]!.value!,
		author: author.id,
		language: client.getLanguage(submission.guild!),
		contributors: [author.id],
		body: components[1]!.components[0]!.value!,
		footer: components[2]?.components[0]?.value,
		createdAt: Date.now(),
	};

	await client.database.createArticle(article);

	client.logging.get(interaction.guild!.id)?.log('articleAdd', article);

	submission.respond({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		ephemeral: true,
		embeds: [{
			title: 'Article submitted successfully!',
			description:
				`Your article, \`${article.title}\`, has been submitted successfully.`,
			color: configuration.responses.colors.green,
		}],
	});
}

/** Displays an available article to the user. */
async function view(client: Client, interaction: Interaction): Promise<void> {
	const language = client.getLanguage(interaction.guild!);

	const articles = await client.database.getArticlesByLanguage(language);

	if (interaction.isAutocomplete()) {
		return showResults({
			interaction: interaction,
			articles: articles,
		});
	}

	const data = interaction.data as InteractionApplicationCommandData;
	const index = parseInt(data.options[0]!.options![0]!.value!);
	const article = articles[index]! as Article;

	return showArticle({
		interaction: interaction,
		article: article,
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
		article.title.toLowerCase().includes(value.toLowerCase())
	);

	interaction.respond({
		type: InteractionResponseType.APPLICATION_COMMAND_AUTOCOMPLETE_RESULT,
		choices: articlesByName.map((article, index) => {
			return {
				name: article.title,
				value: index.toString(),
			};
		}),
	});
}

function showArticle({
	interaction,
	article,
}: {
	interaction: Interaction;
	article: Article;
}): void {
	const contributorsString = article.contributors.map((id) =>
		mention(id, MentionType.USER)
	).join(', ');

	const sections = article.body.split('\n\n');

	const pages = sections.reduce<string[]>(
		(accumulated, section) => {
			if (accumulated.length === 0) {
				accumulated.push('');
			}

			const last = accumulated[accumulated.length - 1]!;

			const pendingLength = last.length + section.length;
			const maximumLength = 1024 - 2 * (accumulated.length - 1);

			if (
				pendingLength < maximumLength && section[section.length - 1] !== ':'
			) {
				accumulated[accumulated.length - 1] = `${last}\n\n${section}`;
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
			title: article.title,
			description: `
Contributors: ${contributorsString}
Last updated: ${time(article.createdAt!)}).`,
			color: configuration.responses.colors.blue,
		},
		view: {
			title: 'Answer',
			generate: (page) => page,
		},
	});
}

export default command;
