import * as Discord from "@discordeno/bot";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { OptionTemplate } from "../../../command";
import { article, dialect } from "../../../parameters";

const command: OptionTemplate = {
	name: "edit",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handleAutocomplete: handleEditArticleAutocomplete,
	handle: handleEditArticle,
	options: [article, dialect],
};

async function handleEditArticleAutocomplete(
	[_client, _bot]: [Client, Discord.Bot],
	_interaction: Logos.Interaction,
): Promise<void> {}

async function handleEditArticle(
	[_client, _bot]: [Client, Discord.Bot],
	_interaction: Logos.Interaction,
): Promise<void> {}

export default command;
