import {
	_,
	ApplicationCommandFlags,
	getDmChannel,
	guildIconURL,
	Interaction,
	InteractionResponseTypes,
	InteractionTypes,
	sendInteractionResponse,
	sendMessage,
} from '../../../../../deps.ts';
import { Client, getLanguage } from '../../../../client.ts';
import configuration from '../../../../configuration.ts';
import {
	getMostRecentArticleContent,
} from '../../../../database/structs/articles/article.ts';
import { createVerificationPrompt, trim } from '../../../../utils.ts';
import {
	openArticleEditor,
	showResults,
	verifyCanAct,
	verifyIsContributor,
} from '../article.ts';

/** Allows the user to edit an existing article. */
async function editArticle(
	client: Client,
	interaction: Interaction,
): Promise<void> {
	const language = getLanguage(client, interaction.guildId!);

	function showArticleEditFailure(interaction: Interaction): void {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Failed to update article',
						description: `Failed to edit article..`,
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
	if (!documentsUnprocessed) return showArticleEditFailure(interaction);

	const documents = await client.database.processArticles(documentsUnprocessed);
	if (!documents) return showArticleEditFailure(interaction);

	if (interaction.type === InteractionTypes.ApplicationCommandAutocomplete) {
		return showResults({
			interaction: interaction,
			articlesWrapped: documents.map((document) => ({
				article: document.data,
				displayDialect: false,
			})),
		});
	}

	const isContributor = await verifyIsContributor(interaction.member!);

	const author = await client.database.getOrCreateUser(
		'id',
		interaction.user.id.toString(),
	);
	if (!author) return showArticleEditFailure(interaction);

	const canAct = await verifyCanAct({
		client: client,
		user: author,
		action: 'EDIT',
		isContributor: isContributor,
	});
	if (canAct === undefined) return showArticleEditFailure(interaction);
	if (canAct === false) {
		return void sendInteractionResponse(
			client.bot,
			interaction.id,
			interaction.token,
			{
				type: InteractionResponseTypes.ChannelMessageWithSource,
				data: {
					flags: ApplicationCommandFlags.Ephemeral,
					embeds: [{
						title: 'Maximum number of edits reached',
						description: `You must wait before trying to edit another article.`,
						color: configuration.interactions.responses.colors.red,
					}],
				},
			},
		);
	}

	const data = interaction.data;
	if (!data) return;

	const indexString = <string | undefined> data.options?.at(0)?.options?.at(0)
		?.value;
	if (!indexString) return;

	const index = parseInt(indexString);
	if (isNaN(index)) return;

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

	const articleChange = {
		author: author.ref,
		article: document.ref,
		content: newContent,
	};

	let [isAccepted, by] = [true, interaction.member!];

	const guild = client.guilds.get(interaction.guildId!);
	if (!guild) return;

	if (!isContributor) {
		sendInteractionResponse(client.bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: 'Edit received.',
					description:
						`Your article edit has been received and is awaiting verification.`,
					color: configuration.interactions.responses.colors.yellow,
				}],
			},
		});

		const verificationPromptInformation = await createVerificationPrompt(
			client,
			submission.guildId!,
			{
				title: newContent.title,
				fields: [
					{
						name: 'Body',
						value: trim(newContent.body, 300),
					},
					...(!newContent.footer ? [] : [{
						name: 'Footer',
						value: trim(newContent.footer, 300),
					}]),
				],
			},
		);
		if (!verificationPromptInformation) return;

		[isAccepted, by] = verificationPromptInformation;

		const dmChannel = await getDmChannel(client.bot, interaction.user.id);
		if (!dmChannel) return;

		sendMessage(client.bot, dmChannel.id, {
			embeds: [
				{
					thumbnail: (() => {
						const iconURL = guildIconURL(client.bot, guild.id, guild.icon);
						if (!iconURL) return undefined;

						return {
							url: iconURL,
						};
					})(),
					...(isAccepted
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
						}),
				},
			],
		});

		client.logging.get(submission.guildId!)?.log(
			isAccepted ? 'articleEditAccept' : 'articleEditReject',
			document.data,
			articleChange,
			by,
		);

		if (!isAccepted) return;
	} else {
		sendInteractionResponse(client.bot, interaction.id, interaction.token, {
			type: InteractionResponseTypes.ChannelMessageWithSource,
			data: {
				flags: ApplicationCommandFlags.Ephemeral,
				embeds: [{
					title: '🥳 Your article edit has been applied.',
					description: `Your edit is now featured.`,
					color: configuration.interactions.responses.colors.green,
				}],
			},
		});
	}

	const change = await client.database.changeArticle(articleChange);
	if (!change) return showArticleEditFailure(submission);

	client.logging.get(submission.guildId!)?.log(
		'articleEdit',
		document.data,
		change.data,
		submission.member!,
	);

	return;
}

export { editArticle };
