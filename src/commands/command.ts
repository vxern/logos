import {
	_,
	ApplicationCommand,
	ApplicationCommandInteraction,
	ApplicationCommandOption,
	ApplicationCommandOptionType,
	ApplicationCommandPartial,
	ApplicationCommandPermissionPayload,
	ApplicationCommandPermissionType,
	ApplicationCommandType,
	Collection,
	Guild,
	GuildSlashCommmandPermissionsPartial,
} from '../../deps.ts';
import { Client } from '../client.ts';
import { roles } from '../modules/roles/module.ts';
import { resolveGuildRole } from '../modules/roles/data/structures/role.ts';
import { Availability } from './structs/availability.ts';
import { Command, InteractionHandler } from './structs/command.ts';
import { Option } from './structs/option.ts';
import configuration from '../configuration.ts';

/**
 * A handler for interactions that are missing a handler.
 *
 * @param interaction - The interaction to be handled.
 */
function unimplemented(
	_client: Client,
	interaction: ApplicationCommandInteraction,
): void {
	interaction.respond({
		embeds: [{
			title: 'Unimplemented',
			description: 'This command is missing a handler.',
		}],
		ephemeral: true,
	});
}

/** Taking a locally defined command, converts it into an application command. */
function createApplicationCommand(command: Command): ApplicationCommandPartial {
	return {
		name: command.name,
		description: command.description,
		options: command.options as ApplicationCommandOption[],
		type: ApplicationCommandType.CHAT_INPUT,
		defaultPermission: false,
	};
}

/**
 * Merges multiple {@link Command}s' {@link Option}s into a single array.
 *
 * @param commands - The commands whose options to merge.
 * @returns The merged command.
 */
function mergeOptions(commands: Command[]): Command | undefined {
	if (commands.length === 0) return undefined;

	const command = commands[0]!;
	command.options = Array<Option>().concat(
		...commands.map((command) => command.options ?? []),
	);

	return command;
}

/**
 * Unifies the command's option handlers into a single handler.
 *
 * @param command - The command whose handlers to unify.
 * @returns The unified handler.
 */
function unifyHandlers(command: Command): InteractionHandler {
	const handlers = new Map<
		string | undefined,
		Map<string | undefined, InteractionHandler>
	>();

	handlers.set(
		undefined,
		new Map([[undefined, command.handle ?? unimplemented]]),
	);

	for (const option of command.options ?? []) {
		switch (option.type) {
			case ApplicationCommandOptionType.SUB_COMMAND_GROUP: {
				const commandMap = handlers.get(option.name) ??
					handlers.set(option.name, new Map())!.get(option.name)!;
				for (const command of option.options!) {
					commandMap.set(command.name, command.handle ?? unimplemented);
				}
				break;
			}
			case ApplicationCommandOptionType.SUB_COMMAND: {
				const commandMap = handlers.get(undefined)!;
				commandMap.set(option.name, option.handle ?? unimplemented);
				break;
			}
		}
	}

	return (client, interaction) =>
		handlers.get(interaction.subCommandGroup)!.get(interaction.subCommand)!(
			client,
			interaction,
		);
}

/**
 * Generates permissions for an array of commands.
 *
 * @param guild - The target guild.
 * @param guildCommands - The existent guild commands.
 * @param commands - The local defined application commands.
 */
async function generatePermissions(
	guild: Guild,
	guildCommands: Collection<string, ApplicationCommand>,
	commands: Command[],
): Promise<GuildSlashCommmandPermissionsPartial[]> {
	const proficiencyCategory = roles.scopes.global.find((category) =>
		category.name === 'Proficiency'
	)!;
	const proficiencyRoleNames = proficiencyCategory.collection!.list!.map((
		role,
	) => role.name);
	const proficiencyRoles = await Promise.all(
		proficiencyRoleNames.map((proficiencyRoleName) =>
			resolveGuildRole(guild, proficiencyRoleName)
		),
	);

	const everyoneRoleID = (await guild.getEveryoneRole()).id;
	const memberRoleIDs = proficiencyRoles
		.filter((proficiencyRole) => proficiencyRole)
		.map((proficiencyRole) => proficiencyRole!.id);
	const moderatorRoleID =
		(await resolveGuildRole(guild, configuration.guilds.moderation.enforcer))
			?.id;

	const permissions: GuildSlashCommmandPermissionsPartial[] = [];
	for (const [id, guildCommand] of guildCommands) {
		const guildCommandPermissions: ApplicationCommandPermissionPayload[] = [];

		const correspondingCommand = commands.find((command) =>
			command.name === guildCommand.name
		);

		if (!correspondingCommand) {
			return [];
		}

		switch (correspondingCommand.availability) {
			case Availability.EVERYONE: {
				guildCommandPermissions.push({
					id: everyoneRoleID,
					type: ApplicationCommandPermissionType.ROLE,
					permission: true,
				});
				break;
			}
			case Availability.MEMBERS: {
				for (const memberRoleID of memberRoleIDs) {
					guildCommandPermissions.push({
						id: memberRoleID,
						type: ApplicationCommandPermissionType.ROLE,
						permission: true,
					});
				}
				break;
			}
			case Availability.MODERATORS: {
				if (!moderatorRoleID) continue;

				guildCommandPermissions.push({
					id: moderatorRoleID,
					type: ApplicationCommandPermissionType.ROLE,
					permission: true,
				});
				break;
			}
			case Availability.OWNER: {
				guildCommandPermissions.push({
					id: guild.ownerID!,
					type: ApplicationCommandPermissionType.USER,
					permission: true,
				});
				break;
			}
		}

		permissions.push({ id: id, permissions: guildCommandPermissions });
	}

	return permissions;
}

export {
	createApplicationCommand,
	generatePermissions,
	mergeOptions,
	unifyHandlers,
	unimplemented,
};
