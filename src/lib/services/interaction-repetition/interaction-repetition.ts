import * as Discord from "@discordeno/bot";
import constants from "../../../constants/constants";
import { handleInteractionCreate, localise } from "../../client";
import {
	createInteractionCollector,
	decodeId,
	deleteReply,
	editReply,
	getCommandName,
	getLocaleData,
	postponeReply,
} from "../../interactions";
import { GlobalService } from "../service";

type InteractionRepetitionButtonID = [interactionId: string];

class InteractionRepetitionService extends GlobalService {
	async start(): Promise<void> {}

	async stop(): Promise<void> {}

	async interactionCreate(interactionRaw: Discord.Interaction): Promise<void> {
		if (interactionRaw.type === Discord.InteractionTypes.ApplicationCommand) {
			this.handleApplicationCommand(interactionRaw);
			return;
		}

		const customId = interactionRaw.data?.customId;
		if (customId === undefined) {
			return;
		}

		const [id, interactionId] = decodeId<InteractionRepetitionButtonID>(customId);
		if (id !== constants.components.showInChat) {
			return;
		}

		await postponeReply([this.client, this.bot], interactionRaw);

		const confirmCustomId = createInteractionCollector([this.client, this.bot], {
			type: Discord.InteractionTypes.MessageComponent,
			userId: interactionRaw.user.id,
			limit: 1,
			onCollect: async (selection) => {
				deleteReply([this.client, this.bot], interactionRaw);

				const originalInteraction = this.client.cache.interactions.get(interactionId);
				if (originalInteraction === undefined) {
					return;
				}

				this.client.cache.interactions.delete(interactionId);

				deleteReply([this.client, this.bot], originalInteraction);

				const interactionSpoofed: Discord.Interaction = {
					...originalInteraction,
					type: Discord.InteractionTypes.ApplicationCommand,
					token: selection.token,
					id: selection.id,
				};

				await handleInteractionCreate([this.client, this.bot], interactionSpoofed, { show: true });
			},
		});

		const cancelCustomId = createInteractionCollector([this.client, this.bot], {
			type: Discord.InteractionTypes.MessageComponent,
			userId: interactionRaw.user.id,
			limit: 1,
			onCollect: async (_) => deleteReply([this.client, this.bot], interactionRaw),
		});

		const localeData = await getLocaleData(this.client, interactionRaw);

		const locale = localeData.locale;

		const strings = {
			title: localise(this.client, "interactions.show.sureToShow.title", locale)(),
			description: localise(this.client, "interactions.show.sureToShow.description", locale)(),
			yes: localise(this.client, "interactions.show.sureToShow.yes", locale)(),
			no: localise(this.client, "interactions.show.sureToShow.no", locale)(),
		};

		editReply([this.client, this.bot], interactionRaw, {
			embeds: [{ title: strings.title, description: strings.description, color: constants.colors.dullYellow }],
			components: [
				{
					type: Discord.MessageComponentTypes.ActionRow,
					components: [
						{
							type: Discord.MessageComponentTypes.Button,
							customId: confirmCustomId,
							label: strings.yes,
							style: Discord.ButtonStyles.Success,
						},
						{
							type: Discord.MessageComponentTypes.Button,
							customId: cancelCustomId,
							label: strings.no,
							style: Discord.ButtonStyles.Danger,
						},
					],
				},
			],
		});
	}

	async handleApplicationCommand(interaction: Discord.Interaction): Promise<void> {
		const commandName = getCommandName(interaction);
		if (commandName === undefined) {
			return;
		}

		if (!this.client.commands.showable.includes(commandName)) {
			return;
		}

		this.client.cache.interactions.set(interaction.id.toString(), interaction);
	}
}

export { InteractionRepetitionService };
export type { InteractionRepetitionButtonID };
