import type { Client } from "logos/client";
import type { Praise } from "logos/database/praise";

function getPraisePage(
	client: Client,
	interaction: Logos.Interaction,
	praises: Praise[],
	isSelf: boolean,
	type: "author" | "target",
): Discord.CamelizedDiscordEmbed {
	if (praises.length === 0) {
		if (isSelf) {
			let strings: { title: string; description: string };
			switch (type) {
				case "author": {
					strings = constants.contexts.noPraisesForSelfAsAuthor({
						localise: client.localise.bind(client),
						locale: interaction.locale,
					});
					break;
				}
				case "target": {
					strings = constants.contexts.noPraisesForSelfAsTarget({
						localise: client.localise.bind(client),
						locale: interaction.locale,
					});
					break;
				}
			}

			return {
				title: strings.title,
				description: strings.description,
			};
		}

		let strings: { title: string; description: string };
		switch (type) {
			case "author": {
				strings = constants.contexts.noPraisesForOtherAsAuthor({
					localise: client.localise.bind(client),
					locale: interaction.locale,
				});
				break;
			}
			case "target": {
				strings = constants.contexts.noPraisesForOtherAsTarget({
					localise: client.localise.bind(client),
					locale: interaction.locale,
				});
				break;
			}
		}

		return {
			title: strings.title,
			description: strings.description,
		};
	}

	const strings = constants.contexts.praise({ localise: client.localise.bind(client), locale: interaction.locale });

	return {
		title: strings.title,
		description: praises
			.map((praise) => {
				const user = client.entities.users.get(BigInt(type === "author" ? praise.targetId : praise.authorId));
				const userDisplay = client.diagnostics.user(user ?? praise.authorId);

				const commentFormatted =
					praise.comment !== undefined ? `– ${praise.comment}` : `*${strings.noComment}*`;
				const userFormatted =
					type === "author" ? `${constants.emojis.indicators.arrowRight} ${userDisplay}` : userDisplay;

				return `${commentFormatted}\n${userFormatted}`;
			})
			.join("\n"),
	};
}

export { getPraisePage };