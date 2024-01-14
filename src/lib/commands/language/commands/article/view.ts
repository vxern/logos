import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { FeatureLanguage, isFeatureLanguage } from "../../../../../constants/languages";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { Article, ArticleVersion } from "../../../../database/article";
import { Guild } from "../../../../database/guild";
import { paginate, parseArguments, respond } from "../../../../interactions";
import { OptionTemplate } from "../../../command";
import { article, dialect, show } from "../../../parameters";

const command: OptionTemplate = {
	name: "view",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handleAutocomplete: handleViewArticleAutocomplete,
	handle: handleViewArticle,
	isShowable: true,
	options: [article, dialect, show],
};

async function handleViewArticleAutocomplete(
	[client, bot]: [Client, Discord.Bot],
	interaction: Logos.Interaction,
): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const session = client.database.openSession();

	const guildDocument =
		client.cache.documents.guilds.get(guildId.toString()) ??
		(await session.load<Guild>(`guilds/${guildId}`).then((value) => value ?? undefined));

	session.dispose();

	if (guildDocument === undefined) {
		return;
	}

	const configuration = guildDocument.features.language.features?.articles;
	if (configuration === undefined || !configuration.enabled) {
		return;
	}

	const [{ article: articleOrUndefined }] = parseArguments(interaction.data?.options, {});

	if (articleOrUndefined === undefined) {
		return;
	}

	const featureLanguage = interaction.featureLanguage;

	const articleMapCached =
		client.cache.documents.articlesByLanguage.get(featureLanguage) ?? new Map<FeatureLanguage, Article>();
	const articleDocuments = Array.from(articleMapCached.values());

	// TODO(vxern): Filter by dialect also.

	const articleQueryRaw = articleOrUndefined ?? "";

	const articleQueryTrimmed = articleQueryRaw.trim();
	const articleQueryLowercase = articleQueryTrimmed.toLowerCase();

	const choices = articleDocuments
		.filter((article) => article.versions.at(-1)?.title.toLowerCase().includes(articleQueryLowercase))
		.slice(0, 25)
		.map<[ArticleVersion, string]>((article) => {
			const latestVersion = article.versions.at(-1);
			if (latestVersion === undefined) {
				throw "StateError: Article document did not have a latest version.";
			}

			return [latestVersion, article.id];
		})
		.map(([version, id]) => ({ name: version.title, value: id }));

	respond([client, bot], interaction, choices);

	return;
}

async function handleViewArticle([client, bot]: [Client, Discord.Bot], interaction: Logos.Interaction): Promise<void> {
	const [{ article: articleId, show: showParameter }] = parseArguments(interaction.data?.options, { show: "boolean" });
	if (articleId === undefined) {
		return;
	}

	const show = interaction.show ?? showParameter ?? false;
	const locale = show ? interaction.guildLocale : interaction.locale;

	const compositeIdParts = articleId.split("/").slice(1);
	const compositeId = compositeIdParts.join("/");

	const [featureLanguageRaw, createdAt] = compositeId.split("/");
	if (featureLanguageRaw === undefined || createdAt === undefined) {
		return;
	}

	if (!isFeatureLanguage(featureLanguageRaw)) {
		return;
	}

	const featureLanguage = featureLanguageRaw;

	const article = client.cache.documents.articlesByLanguage.get(featureLanguage)?.get(compositeId);
	if (article === undefined) {
		return;
	}

	const latestVersion = article.versions.at(-1);
	if (latestVersion === undefined) {
		return;
	}

	const sections = latestVersion.body.split("\n\n");
	const pages = sections.reduce<string[]>((accumulated, section) => {
		const last = accumulated[accumulated.length - 1] ?? "";

		const pendingLength = last.length + section.length;
		const maximumLength = 1024 - 2 * (accumulated.length - 1);

		if (pendingLength < maximumLength && section[section.length - 1] !== ":") {
			const lastIndex = Math.max(0, accumulated.length - 1);

			accumulated[lastIndex] = last.length === 0 ? section : `${last}\n\n${section}`;
		} else {
			accumulated.push(section);
		}

		return accumulated;
	}, []);

	paginate(
		[client, bot],
		interaction,
		{
			getElements: () => pages,
			embed: { color: constants.colors.blue },
			view: { title: latestVersion.title, generate: (page) => page },
			showable: true,
			show: show ?? false,
		},
		{ locale },
	);
}

export default command;
