import { codeMultiline } from "rost:constants/formatting";
import type { EventLogger } from "rost/stores/journalling/loggers";

const logger: EventLogger<"entryRequestSubmit"> = (client, [user, entryRequest], { guildLocale }) => {
	const strings = {
		...constants.contexts.verificationModal({ localise: client.localise, locale: guildLocale }),
		...constants.contexts.entryRequestSubmit({ localise: client.localise, locale: guildLocale }),
	};
	return {
		flags: Discord.MessageFlags.IsComponentV2,
		components: [
			{
				type: Discord.MessageComponentTypes.Container,
				accentColor: constants.colours.success,
				components: [
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `# ${constants.emojis.events.entryRequest.submitted} ${strings.title}\n${strings.description({ user: client.diagnostics.user(user) })}`,
					},
					{
						type: Discord.MessageComponentTypes.Separator,
						spacing: Discord.SeparatorSpacingSize.Large,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.reason}\n${codeMultiline(entryRequest.formData.reason)}`,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.aim}\n${codeMultiline(entryRequest.formData.aim)}`,
					},
					{
						type: Discord.MessageComponentTypes.TextDisplay,
						content: `### ${strings.fields.whereFound}\n${codeMultiline(entryRequest.formData.whereFound)}`,
					},
				],
			},
		],
	};
};

export default logger;
