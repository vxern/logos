type AutocompleteInteraction = (Discord.Interaction | Logos.Interaction) & {
	type: Discord.InteractionTypes.ApplicationCommandAutocomplete;
};

function isAutocomplete(interaction: Discord.Interaction | Logos.Interaction): interaction is AutocompleteInteraction {
	return interaction.type === Discord.InteractionTypes.ApplicationCommandAutocomplete;
}

function isSubcommandGroup(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommandGroup;
}

function isSubcommand(option: Discord.InteractionDataOption): boolean {
	return option.type === Discord.ApplicationCommandOptionTypes.SubCommand;
}

export { isAutocomplete, isSubcommand, isSubcommandGroup };
