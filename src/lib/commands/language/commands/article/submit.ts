import * as Discord from "@discordeno/bot";
import * as Logos from "../../../../../types";
import { Client, localise } from "../../../../client";
import { OptionTemplate } from "../../../command";
import { LocalisationLanguage } from "../../../../../constants/languages";
import { reply } from "../../../../interactions";
import constants from "../../../../../constants/constants";
import { Guild, timeStructToMilliseconds } from "../../../../database/guild";
import defaults from "../../../../../defaults";
import { verifyIsWithinLimits } from "../../../../utils";
import { Article } from "../../../../database/article";

const command: OptionTemplate = {
	name: "submit",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleSubmitArticle,
};

async function handleSubmitArticle(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	let session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const featureLanguage = guildDocument.languages?.feature ?? defaults.FEATURE_LANGUAGE;

	const configuration = guildDocument.features.language.features?.articles;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const articleMapCached = client.cache.documents.articlesByLanguage.get(featureLanguage);
	const articleDocuments = articleMapCached !== undefined ? Array.from(articleMapCached.values()) : [];
	const intervalMilliseconds = timeStructToMilliseconds(configuration.rateLimit?.within ?? defaults.ARTICLE_INTERVAL);
	if (
		!verifyIsWithinLimits(
			articleDocuments.map((articleDocument) => {
				const initialVersion = articleDocument.versions.at(0);
				if (initialVersion === undefined) {
					throw "StateError: Article document did not have an initial version.";
				}

				return initialVersion.createdAt;
			}),
			configuration.rateLimit?.uses ?? defaults.ARTICLE_LIMIT,
			intervalMilliseconds,
		)
	) {
		const strings = {
			title: localise(client, "article.options.submit.strings.tooMany.title", locale)(),
			description: {
				alreadySubmitted: localise(
					client,
					"article.options.submit.strings.tooMany.description.alreadySubmitted",
					locale,
				)(),
				shouldWait: localise(client, "article.options.submit.strings.tooMany.description.shouldWait", locale)(),
			},
		};

		reply([client, bot], interaction, {
			embeds: [
				{
					title: strings.title,
					description: `${strings.description.alreadySubmitted}\n\n${strings.description.shouldWait}`,
					color: constants.colors.dullYellow,
				},
			],
		});
		return;
	}

	// TODO(vxern): Open article editor and listen for a submission.
	const languages: LocalisationLanguage[] = ["Romanian"]; // TODO(vxern): IMPLEMENT
	const answers = {
		title: "",
		body: "",
		footnotes: "",
	};

	session = client.database.openSession();

	const createdAt = Date.now();
	const articleDocument = {
		...({
			id: `articles/${featureLanguage}/${createdAt}`,
			guildId: guildId.toString(),
			languages,
			versions: [
				{
					title: answers.title,
					body: answers.body,
					footnotes: answers.footnotes,
					authorId: interaction.user.id.toString(),
					createdAt,
				},
			],
		} satisfies Article),
		"@metadata": { "@collection": "Articles" },
	};

	await session.store(articleDocument);
	await session.saveChanges();

	if (configuration.journaling) {
		const journallingService = client.services.journalling.get(guildId);
		journallingService?.log("articleSubmit", { args: [interaction.user, articleDocument] });
	}

	const strings = {
		title: localise(client, "article.options.submit.strings.created.title", locale)(),
		description: {
			created: localise(client, "article.options.submit.strings.created.description.created", locale)(),
			mayViewIt: localise(
				client,
				"article.options.submit.strings.created.description.mayViewIt",
				locale,
			)({ command: "`/article view`" }),
		},
	};

	reply([client, bot], interaction, {
		embeds: [
			{
				title: strings.title,
				description: `${strings.description.created}\n\n${strings.description.mayViewIt}`,
				color: constants.colors.green,
			},
		],
	});
}

export default command;
