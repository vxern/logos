import { Locale } from "../../../../../constants/languages";
import diagnostics from "../../../../../diagnostics";
import { Client } from "../../../../client";
import { Praise } from "../../../../database/praise";

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
				title: client.localise("list.options.praises.strings.noPraises.title", locale)(),
				description:
					type === "author"
						? client.localise("list.options.praises.strings.noPraises.description.self.author", locale)()
						: client.localise("list.options.praises.strings.noPraises.description.self.target", locale)(),
			};

			return {
				title: strings.title,
				description: strings.description,
				color: constants.colours.blue,
			};
		}
		const strings = {
			title: client.localise("list.options.praises.strings.noPraises.title", locale)(),
			description:
				type === "author"
					? client.localise("list.options.praises.strings.noPraises.description.other.author", locale)()
					: client.localise("list.options.praises.strings.noPraises.description.other.target", locale)(),
		};

		return {
			title: strings.title,
			description: strings.description,
			color: constants.colours.blue,
		};
	}

	const strings = {
		title: client.localise("list.options.praises.strings.praises.title", locale)(),
		noComment: client.localise("list.options.praises.strings.praises.noComment", locale)(),
	};

	return {
		title: strings.title,
		description: praises
			.map((praise) => {
				const user = client.entities.users.get(BigInt(type === "author" ? praise.targetId : praise.authorId));
				const userDisplay = diagnostics.display.user(user ?? praise.authorId, { includeId: false });

				const commentFormatted = praise.comment !== undefined ? `– ${praise.comment}` : `*${strings.noComment}*`;
				const userFormatted =
					type === "author" ? `${constants.emojis.indicators.arrowRight} ${userDisplay}` : userDisplay;

				return `${commentFormatted}\n${userFormatted}`;
			})
			.join("\n"),
		color: constants.colours.blue,
	};
}

export { getPraisePage };
