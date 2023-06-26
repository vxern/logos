import {
	addRole,
	ApplicationCommandOptionTypes,
	Bot,
	Interaction,
	InteractionCallbackData,
	InteractionTypes,
	MessageComponentTypes,
	removeRole,
	Role as DiscordRole,
	SelectOption,
	snowflakeToBigint,
} from 'discordeno';
import { OptionTemplate } from 'logos/src/lib/commands/command.ts';
import roles, { getRoleCategories, getRoles } from 'logos/src/lib/commands/social/roles/roles.ts';
import {
	isCustom,
	isGroup,
	isSingle,
	Role,
	RoleCategory,
	RoleCategoryGroup,
	RoleCustom,
	RoleImplicit,
} from 'logos/src/lib/commands/social/roles/types.ts';
import { Client, localise } from 'logos/src/lib/client.ts';
import { acknowledge, createInteractionCollector, editReply, reply } from 'logos/src/lib/interactions.ts';
import constants from 'logos/src/constants.ts';
import { trim } from 'logos/src/formatting.ts';
import { defaultLocale } from 'logos/src/types.ts';

const command: OptionTemplate = {
	name: 'roles',
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleOpenRoleSelectionMenu,
};

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 */
function handleOpenRoleSelectionMenu([client, bot]: [Client, Bot], interaction: Interaction): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const rootCategories = getRoleCategories(roles, guild.id).map(([category, _index]) => category);

	return createRoleSelectionMenu(
		[client, bot],
		interaction,
		{
			navigationData: {
				root: {
					type: 'group',
					id: 'roles.noCategory',
					color: constants.colors.invisible,
					emoji: constants.symbols.roles.noCategory,
					categories: rootCategories,
				},
				indexesAccessed: [],
			},
			guildId: guild.id,
		},
	);
}

/**
 * Represents a template for data used in browsing through the selection menu and
 * managing the interaction that requested it.
 */
interface BrowsingData {
	/**
	 * The navigation data associated with this menu required for the
	 * ability to browse through it.
	 */
	navigationData: NavigationData;

	/** The ID of the guild where the interaction was made. */
	guildId: bigint;
}

/**
 * Represents a template for data used in navigation between sections of the
 * role selection menu.
 */
interface NavigationData {
	/**
	 * The root category, which is not part of another category's list of
	 * categories.
	 */
	root: RoleCategoryGroup;

	/**
	 * A stack containing the indexes accessed in succession to arrive at the
	 * current position in the role selection menu.
	 */
	indexesAccessed: number[];
}

/**
 * Traverses the role category tree and returns the role category the user is
 * viewing currently.
 *
 * @param data - Navigation data for the selection menu.
 * @returns The category the user is now viewing.
 */
function traverseRoleSelectionTree(data: NavigationData): [RoleCategory, ...RoleCategory[]] {
	return data.indexesAccessed.reduce<[RoleCategory, ...RoleCategory[]]>(
		(categories, next) => {
			categories.push((categories.at(-1)! as RoleCategoryGroup).categories.at(next)!);
			return categories;
		},
		[data.root],
	);
}

/**
 * Creates a browsing menu for selecting roles.
 */
function createRoleSelectionMenu(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: BrowsingData,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const emojiIdsByName = new Map(
		guild.emojis.map((emoji) => [emoji.name!, emoji.id!]),
	);

	const member = client.cache.members.get(snowflakeToBigint(`${interaction.user.id}${guild.id}`));
	if (member === undefined) return;

	const rolesById = new Map(guild.roles.array().map((role) => [role.id, role]));

	const customId = createInteractionCollector(
		[client, bot],
		{
			type: InteractionTypes.MessageComponent,
			userId: interaction.user.id,
			onCollect: async (bot, selection) => {
				acknowledge([client, bot], selection);

				const indexString = selection.data?.values?.at(0);
				if (indexString === undefined) return;

				const index = Number(indexString);
				if (isNaN(index)) return;

				if (index === -1) {
					data.navigationData.indexesAccessed.pop();
					displayData = traverseRoleTreeAndDisplay([client, bot], selection, displayData);
					return;
				}

				const viewData = displayData.viewData!;

				if (isGroup(viewData.category)) {
					data.navigationData.indexesAccessed.push(index);
					displayData = traverseRoleTreeAndDisplay([client, bot], selection, displayData);
					return;
				}

				const role = viewData.menuRolesResolved.at(index)!;
				const alreadyHasRole = viewData.memberRolesIncludedInMenu.includes(role.id);

				if (alreadyHasRole) {
					if (
						viewData.category.minimum !== undefined &&
						viewData.memberRolesIncludedInMenu.length <= viewData.category.minimum
					) {
						displayData = traverseRoleTreeAndDisplay([client, bot], interaction, displayData, true);
						return;
					}

					removeRole(bot, guild.id, member.id, role.id, 'User-requested role removal.')
						.catch(() =>
							client.log.warn(
								`Failed to remove role with ID ${role.id} from member with ID ${member.id} in guild with ID ${guild.id}.`,
							)
						);
					displayData.roleData.memberRoleIds.splice(
						displayData.roleData.memberRoleIds.findIndex((roleId) => roleId === role.id)!,
						1,
					);
					viewData.memberRolesIncludedInMenu.splice(
						viewData.memberRolesIncludedInMenu.findIndex((roleId) => roleId === role.id)!,
						1,
					);
				} else {
					if (
						viewData.category.maximum !== undefined && viewData.category.maximum !== 1 &&
						viewData.memberRolesIncludedInMenu.length >= viewData.category.maximum
					) {
						const strings = {
							title: localise(client, 'warn.strings.limitReached.title', defaultLocale)(),
							description: {
								limitReached: localise(
									client,
									'profile.options.roles.strings.limitReached.description.limitReached',
									interaction.locale,
								)(
									{ 'category': localise(client, `${viewData.category.id}.name`, interaction.locale)() },
								),
								toChooseNew: localise(
									client,
									'profile.options.roles.strings.limitReached.description.toChooseNew',
									interaction.locale,
								)(),
							},
						};

						reply([client, bot], interaction, {
							embeds: [{
								title: strings.title,
								description: `${strings.description.limitReached}\n\n${strings.description.toChooseNew}`,
							}],
						});

						displayData = traverseRoleTreeAndDisplay([client, bot], interaction, displayData, true);
						return;
					}

					await addRole(bot, guild.id, member.id, role.id, 'User-requested role addition.')
						.catch(() =>
							client.log.warn(
								`Failed to add role with ID ${role.id} to member with ID ${member.id} in guild with ID ${guild.id}.`,
							)
						);

					if (viewData.category.maximum === 1) {
						for (const memberRoleId of viewData.memberRolesIncludedInMenu) {
							removeRole(bot, guild.id, member.id, memberRoleId)
								.catch(() =>
									client.log.warn(
										`Failed to remove role with ID ${memberRoleId} from member with ID ${member.id} in guild with ID ${guild.id}.`,
									)
								);

							displayData.roleData.memberRoleIds.splice(
								displayData.roleData.memberRoleIds.findIndex((roleId) => roleId === memberRoleId)!,
								1,
							);
						}
						viewData.memberRolesIncludedInMenu = [];
					}

					displayData.roleData.memberRoleIds.push(role.id);
					displayData.viewData!.memberRolesIncludedInMenu.push(role.id);
				}

				displayData = traverseRoleTreeAndDisplay([client, bot], interaction, displayData, true);
			},
		},
	);

	let displayData = traverseRoleTreeAndDisplay(
		[client, bot],
		interaction,
		{
			customId,
			browsingData: data,
			roleData: { emojiIdsByName, rolesById, memberRoleIds: [...member.roles] },
		},
		false,
	);
}

interface RoleData {
	emojiIdsByName: Map<string, bigint>;
	rolesById: Map<bigint, DiscordRole>;
	memberRoleIds: bigint[];
}

interface ViewData {
	category: RoleCategory;
	menuRoles: Role[];
	menuRolesResolved: DiscordRole[];
	memberRolesIncludedInMenu: bigint[];
}

interface RoleDisplayData {
	readonly customId: string;

	browsingData: BrowsingData;
	roleData: RoleData;
	viewData?: ViewData;
}

function traverseRoleTreeAndDisplay(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: RoleDisplayData,
	editResponse = true,
): RoleDisplayData {
	const categories = traverseRoleSelectionTree(data.browsingData.navigationData);
	const category = categories.at(-1)!;

	let selectOptions: SelectOption[];
	if (isSingle(category)) {
		const menuRoles = getRoles(category.collection, data.browsingData.guildId);
		const snowflakes = (() => {
			const collection = category.collection;
			if (isCustom(collection)) {
				return (menuRoles as RoleCustom[]).map((role) => BigInt(role.snowflake));
			}

			const guildIdString = interaction.guildId!.toString();
			return (menuRoles as RoleImplicit[]).map((role) => BigInt(role.snowflakes[guildIdString]!));
		})();
		const menuRolesResolved = snowflakes.map((snowflake) => data.roleData.rolesById.get(snowflake)!);
		const memberRolesIncludedInMenu = data.roleData.memberRoleIds.filter(
			(roleId) => menuRolesResolved.some((role) => role.id === roleId),
		);

		data.viewData = { category, menuRoles, menuRolesResolved, memberRolesIncludedInMenu };

		selectOptions = createSelectOptionsFromCollection(client, data, interaction.locale);
	} else {
		if (data.viewData === undefined) {
			data.viewData = { category, menuRoles: [], menuRolesResolved: [], memberRolesIncludedInMenu: [] };
		}

		selectOptions = createSelectOptionsFromCategories(
			client,
			category.categories!,
			data.browsingData.guildId,
			interaction.locale,
		);
	}

	data.viewData!.category = category;

	const menu = displaySelectMenu(client, data, categories, selectOptions, interaction.locale);

	if (editResponse) {
		editReply([client, bot], interaction, menu!);

		return data;
	}

	reply([client, bot], interaction, menu!);

	return data;
}

function displaySelectMenu(
	client: Client,
	data: RoleDisplayData,
	categories: [RoleCategory, ...RoleCategory[]],
	selectOptions: SelectOption[],
	locale: string | undefined,
): InteractionCallbackData {
	const isInRootCategory = data.browsingData.navigationData.indexesAccessed.length === 0;
	if (!isInRootCategory) {
		const strings = {
			back: localise(client, 'profile.options.roles.strings.back', locale)(),
		};

		selectOptions.push({ label: trim(strings.back, 25), value: `${-1}` });
	}

	const category = categories.at(-1)!;

	const title = (categories.length > 1 ? categories.slice(1) : categories).map((category) => {
		const strings = {
			categoryName: localise(client, `${category.id}.name`, locale)(),
		};

		return `${category.emoji}  ${strings.categoryName}`;
	}).join(` ${constants.symbols.indicators.arrowRight}  `);

	const strings = {
		description: localise(client, `${category.id}.description`, locale)(),
		chooseCategory: localise(client, 'profile.options.roles.strings.chooseCategory', locale)(),
		chooseRole: localise(client, 'profile.options.roles.strings.chooseRole', locale)(),
	};

	return {
		embeds: [{
			title,
			description: strings.description,
			color: category.color,
		}],
		components: [{
			type: MessageComponentTypes.ActionRow,
			components: [{
				type: MessageComponentTypes.SelectMenu,
				customId: data.customId,
				options: selectOptions,
				placeholder: isGroup(category) ? strings.chooseCategory : strings.chooseRole,
			}],
		}],
	};
}

function createSelectOptionsFromCategories(
	client: Client,
	categories: RoleCategory[],
	guildId: bigint,
	locale: string | undefined,
): SelectOption[] {
	const categorySelections = getRoleCategories(categories, guildId);

	const selections: SelectOption[] = [];
	for (const [category, index] of categorySelections) {
		const strings = {
			name: localise(client, `${category.id}.name`, locale)(),
			description: localise(client, `${category.id}.description`, locale)(),
		};

		selections.push({
			label: trim(`${category.emoji} ${strings.name}`, 25),
			value: index.toString(),
			description: trim(strings.description, 100),
			emoji: { name: '📁' },
		});
	}

	return selections;
}

const emojiExpression = /\p{Extended_Pictographic}/u;

function createSelectOptionsFromCollection(
	client: Client,
	data: RoleDisplayData,
	locale: string | undefined,
): SelectOption[] {
	const selectOptions: SelectOption[] = [];

	const viewData = data.viewData!;

	for (const index of Array(viewData.menuRoles.length).keys()) {
		const [role, roleResolved] = [viewData.menuRoles.at(index)!, viewData.menuRolesResolved.at(index)!];
		const memberHasRole = viewData.memberRolesIncludedInMenu.includes(roleResolved.id);

		const strings = {
			assigned: localise(client, 'profile.options.roles.strings.assigned', locale)(),
			name: localise(client, `${role.id}.name`, locale)(),
			description: localise(client, `${role.id}.description`, locale),
		};

		selectOptions.push({
			label: trim(memberHasRole ? `[${strings.assigned}] ${strings.name}` : strings.name, 25),
			value: index.toString(),
			description: client.localisations.has(`${role.id}.description`) ? trim(strings.description(), 100) : undefined,
			emoji: (() => {
				if (role.emoji === undefined) return;
				if (emojiExpression.test(role.emoji)) return { name: role.emoji };

				const id = data.roleData.emojiIdsByName.get(role.emoji);
				if (id === undefined) return { name: constants.symbols.roles.noCategory };

				return { name: role.emoji, id };
			})(),
		});
	}

	return selectOptions;
}

export default command;
export { handleOpenRoleSelectionMenu };
