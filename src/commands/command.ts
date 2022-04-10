import {
	_,
	ApplicationCommand,
	ApplicationCommandInteraction,
	ApplicationCommandOption,
	ApplicationCommandPartial,
	ApplicationCommandPartialBase,
	ApplicationCommandPermissionPayload,
	ApplicationCommandPermissionType,
	ApplicationCommandType,
	Collection,
	Guild,
	GuildSlashCommmandPermissionsPartial,
	InteractionResponseType,
} from '../../deps.ts';
import { InteractionHandler } from '../client.ts';
import { roles } from '../modules/roles/module.ts';
import { resolveGuildRole } from '../modules/roles/data/structures/role.ts';
import { Availability } from './availability.ts';
import { Option, OptionType } from './option.ts';

/** An application command with an optional handler for its execution. */
interface Command extends ApplicationCommandPartialBase<Option> {
	/** Defines the group of users to whom the command is available. */
	availability: Availability;
	/** The function to be executed when this command is selected. */
	handle?: InteractionHandler;
}

/**
 * A handler for interactions which are missing a handler.
 *
 * @param interaction The interaction to be handled.
 */
function unimplemented(
	interaction: ApplicationCommandInteraction,
): void {
	interaction.respond({
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		embeds: [{
			title: 'Unimplemented',
			description: 'This command is missing a handler.',
		}],
		ephemeral: true,
	});
}

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
function mergeOptions(commands: Command[]): Command {
	const command = commands[0];
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

	if (command.options) {
		for (const option of command.options) {
			switch (option.type) {
				case OptionType.SUB_COMMAND_GROUP: {
					const commandMap = handlers.get(option.name) ??
						handlers.set(option.name, new Map())!.get(option.name)!;
					for (const command of option.options!) {
						commandMap.set(command.name, command.handle ?? unimplemented);
					}
					break;
				}
				case OptionType.SUB_COMMAND: {
					const commandMap = handlers.get(undefined)!;
					commandMap.set(option.name, option.handle ?? unimplemented);
					break;
				}
			}
		}
	}

	return (interaction) =>
		handlers.get(interaction.subCommandGroup)!.get(interaction.subCommand)!(
			interaction,
		);
}

async function createPermissions(
	guild: Guild,
	guildCommands: Collection<string, ApplicationCommand>,
	commands: Command[],
): Promise<GuildSlashCommmandPermissionsPartial[]> {
	const permissions: GuildSlashCommmandPermissionsPartial[] = [];

	const everyoneRoleID = (await guild.getEveryoneRole()).id;
	const proficiencies = roles.scopes.global.find((category) =>
		category.name === 'Proficiency'
	)!.collection!.list!.map((role) => role.name);
	const memberRoleIDs = [];
	for (const proficiency of proficiencies) {
		const role = await resolveGuildRole(guild, proficiency);
		if (!role) continue;

		memberRoleIDs.push(role.id);
	}
	const moderatorRoleID = (await resolveGuildRole(guild, roles.moderator))?.id;

	for (const [id, guildCommand] of guildCommands) {
		const guildCommandPermissions: ApplicationCommandPermissionPayload[] = [];

		const command = commands.find((command) =>
			command.name === guildCommand.name
		)!;

		switch (command.availability) {
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
			}
		}

		permissions.push({ id: id, permissions: guildCommandPermissions });
	}

	return permissions;
}

export {
	createApplicationCommand,
	createPermissions,
	mergeOptions,
	unifyHandlers,
	unimplemented,
};
export type { Command };
