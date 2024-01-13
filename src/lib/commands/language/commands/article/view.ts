import * as Discord from "@discordeno/bot";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { OptionTemplate } from "../../../command";
import { article, dialect } from "../../../parameters";

const command: OptionTemplate = {
	name: "view",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handleAutocomplete: handleViewArticleAutocomplete,
	handle: handleViewArticle,
	options: [article, dialect],
};

async function handleViewArticleAutocomplete(
	[_client, _bot]: [Client, Discord.Bot],
	_interaction: Logos.Interaction,
): Promise<void> {}

async function handleViewArticle(
	[_client, _bot]: [Client, Discord.Bot],
	_interaction: Logos.Interaction,
): Promise<void> {}

export default command;
