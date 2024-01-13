import * as Discord from "@discordeno/bot";
import * as Logos from "../../../../../types";
import { Client } from "../../../../client";
import { OptionTemplate } from "../../../command";

const command: OptionTemplate = {
	name: "submit",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handleAutocomplete: handleSubmitArticleAutocomplete,
	handle: handleSubmitArticle,
};

async function handleSubmitArticleAutocomplete(
	[_client, _bot]: [Client, Discord.Bot],
	_interaction: Logos.Interaction,
): Promise<void> {}

async function handleSubmitArticle(
	[_client, _bot]: [Client, Discord.Bot],
	_interaction: Logos.Interaction,
): Promise<void> {}

export default command;
