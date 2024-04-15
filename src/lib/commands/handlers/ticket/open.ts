import { Client } from "logos/client";
import { TicketComposer } from "logos/commands/components/modal-composers/ticket-composer";
import { Guild } from "logos/database/guild";
import { Ticket, TicketFormData } from "logos/database/ticket";

async function handleOpenTicket(client: Client, interaction: Logos.Interaction): Promise<void> {
	const locale = interaction.locale;

	const guildDocument = await Guild.getOrCreate(client, { guildId: interaction.guildId.toString() });

	const configuration = guildDocument.tickets;
	if (configuration === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(interaction.guildId);
	if (guild === undefined) {
		return;
	}

	const member = interaction.member;
	if (member === undefined) {
		return;
	}

	const crossesRateLimit = Guild.crossesRateLimit(
		await Ticket.getAll(client, { where: { authorId: interaction.user.id.toString() } }),
		configuration.rateLimit ?? constants.defaults.TICKET_RATE_LIMIT,
	);
	if (crossesRateLimit) {
		const strings = {
			title: client.localise("ticket.strings.tooMany.title", locale)(),
			description: client.localise("ticket.strings.tooMany.description", locale)(),
		};

		await client.pushback(interaction, {
			title: strings.title,
			description: strings.description,
		});

		return;
	}

	const composer = new TicketComposer(client, { interaction });

	composer.onSubmit(async (submission: Logos.Interaction, { formData }: { formData: TicketFormData }) => {
		await client.postponeReply(submission);

		const ticketService = client.getPromptService(interaction.guildId, { type: "tickets" });
		if (ticketService === undefined) {
			return;
		}

		const ticketDocument = await ticketService.openTicket({
			type: "standalone",
			formData,
			user: submission.user,
		});
		if (ticketDocument === undefined) {
			return;
		}

		const locale = submission.locale;
		const strings = {
			title: client.localise("ticket.strings.sent.title", locale)(),
			description: client.localise("ticket.strings.sent.description", locale)(),
		};

		await client.succeeded(submission, {
			title: strings.title,
			description: strings.description,
		});
	});

	await composer.open();
}

export { handleOpenTicket };
