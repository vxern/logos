import type { Client } from "rost/client";
import { GameViewComponent } from "rost/commands/components/game-view";

/** Starts a simple game of 'choose the correct word to fit in the blank'. */
async function handleStartGame(client: Client, interaction: Rost.Interaction): Promise<void> {
	const sentencePairCount = await client.volatile?.getSentencePairCount({
		learningLocale: interaction.learningLocale,
	});
	if (sentencePairCount === undefined || sentencePairCount === 0) {
		const strings = constants.contexts.noSentencesAvailable({
			localise: client.localise,
			locale: interaction.locale,
		});
		client
			.warning(interaction, { title: strings.title, description: strings.description }, { autoDelete: true })
			.ignore();

		return;
	}

	const game = new GameViewComponent(client, { interaction });

	await game.display();
}

export { handleStartGame };
