import * as Discord from "@discordeno/bot";
import { OptionTemplate } from "../../../command";
import author from "./praises/author";
import target from "./praises/target";
import { Client, localise } from "../../../../client";
import { Praise } from "../../../../database/praise";
import { Locale } from "../../../../../constants/languages";
import constants from "../../../../../constants/constants";
import diagnostics from "../../../../diagnostics";

const option: OptionTemplate = {
	name: "praises",
	type: Discord.ApplicationCommandOptionTypes.SubCommandGroup,
	options: [author, target],
};

function getPraisePage(
	client: Client,
	praises: Praise[],
	isSelf: boolean,
	type: "author" | "target",
	{ locale }: { locale: Locale },
): Discord.CamelizedDiscordEmbed {
	if (praises.length === 0) {
		if (isSelf) {
			const strings = {
				title: localise(client, "list.options.praises.strings.noPraises.title", locale)(),
				description:
					type === "author"
						? localise(client, "list.options.praises.strings.noPraises.description.self.author", locale)()
						: localise(client, "list.options.praises.strings.noPraises.description.self.target", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			};
		} else {
			const strings = {
				title: localise(client, "list.options.praises.strings.noPraises.title", locale)(),
				description:
					type === "author"
						? localise(client, "list.options.praises.strings.noPraises.description.other.author", locale)()
						: localise(client, "list.options.praises.strings.noPraises.description.other.target", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colors.blue,
			};
		}
	}

	const strings = {
		title: localise(client, "list.options.praises.strings.praises.title", locale)(),
		noComment: localise(client, "list.options.praises.strings.praises.noComment", locale)(),
	};

	return {
		title: strings.title,
		description: praises
			.map((praise) => {
				const user = client.cache.users.get(BigInt(type === "author" ? praise.targetId : praise.authorId));
				const userDisplay = diagnostics.display.user(user ?? praise.authorId, { includeId: false });

				const commentFormatted = praise.comment !== undefined ? `– ${praise.comment}` : `*${strings.noComment}*`;
				const userFormatted =
					type === "author" ? `${constants.symbols.indicators.arrowRight} ${userDisplay}` : userDisplay;

				return `${commentFormatted}\n${userFormatted}`;
			})
			.join("\n"),
		color: constants.colors.blue,
	};
}

export { getPraisePage };
export default option;
