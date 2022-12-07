import {
	addRole,
	ApplicationCommandFlags,
	ApplicationCommandOptionTypes,
	Bot,
	editOriginalInteractionResponse,
	Interaction,
	InteractionResponse,
	InteractionResponseTypes,
	InteractionTypes,
	MessageComponentTypes,
	removeRole,
	Role as DiscordRole,
	SelectOption,
	sendInteractionResponse,
	snowflakeToBigint,
} from 'discordeno';
import { Commands, createLocalisations, localise } from 'logos/assets/localisations/mod.ts';
import { OptionBuilder } from 'logos/src/commands/command.ts';
import roles from 'logos/src/commands/social/data/roles.ts';
import { Role, RoleCategory, RoleCategoryTypes } from 'logos/src/commands/social/data/types.ts';
import { getRelevantCategories, resolveRoles } from 'logos/src/commands/social/module.ts';
import { Client } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/interactions.ts';
import configuration from 'logos/configuration.ts';
import { trim } from 'logos/formatting.ts';
import { defaultLocale, Language } from 'logos/types.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.profile.options.roles),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: handleOpenRoleSelectionMenu,
};

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 */
function handleOpenRoleSelectionMenu(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (guild === undefined) return;

	const rootCategories = getRelevantCategories(roles, guild.language).map(([category, _index]) => category);

	return createRoleSelectionMenu(
		[client, bot],
		interaction,
		{
			navigationData: {
				root: {
					type: RoleCategoryTypes.CategoryGroup,
					name: Commands.profile.options.roles.strings.selectCategory.header,
					description: Commands.profile.options.roles.strings.selectCategory.body,
					color: configuration.messages.colors.invisible,
					emoji: '💭',
					categories: rootCategories,
				},
				indexesAccessed: [],
			},
			language: guild.language,
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

	/** The language of the guild where the interaction was made. */
	language?: Language;
}

type CategoryGroupRoleCategory = RoleCategory & {
	type: RoleCategoryTypes.CategoryGroup;
};

/**
 * Represents a template for data used in navigation between sections of the
 * role selection menu.
 */
interface NavigationData {
	/**
	 * The root category, which is not part of another category's list of
	 * categories.
	 */
	root: CategoryGroupRoleCategory;

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
function traverseRoleSelectionTree(data: NavigationData): RoleCategory {
	return data.indexesAccessed.reduce<RoleCategory>(
		(category, next) => (category as CategoryGroupRoleCategory).categories.at(next)!,
		data.root,
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

	const rolesByName = new Map(guild.roles.array().map((role) => [role.name, role]));

	const customId = createInteractionCollector(
		[client, bot],
		{
			type: InteractionTypes.MessageComponent,
			userId: interaction.user.id,
			onCollect: (bot, selection) => {
				sendInteractionResponse(bot, selection.id, selection.token, {
					type: InteractionResponseTypes.DeferredUpdateMessage,
				});

				const indexString = selection.data?.values?.at(0);
				if (indexString === undefined) return;

				const index = Number(indexString);
				if (isNaN(index)) return;

				if (index === -1) {
					data.navigationData.indexesAccessed.pop();
					displayData = traverseRoleTreeAndDisplay(bot, selection, displayData);
					return;
				}

				const viewData = displayData.viewData!;

				if (viewData.category.type === RoleCategoryTypes.CategoryGroup) {
					data.navigationData.indexesAccessed.push(index);
					displayData = traverseRoleTreeAndDisplay(bot, selection, displayData);
					return;
				}

				const role = viewData.menuRolesResolved.at(index)!;
				const alreadyHasRole = viewData.memberRolesIncludedInMenu.includes(role.id);

				if (alreadyHasRole) {
					removeRole(bot, guild.id, member.id, role.id, 'User-requested role removal.');
					displayData.roleData.memberRoleIds.splice(
						displayData.roleData.memberRoleIds.findIndex((roleId) => roleId === role.id)!,
						1,
					);
					viewData.memberRolesIncludedInMenu.splice(
						viewData.memberRolesIncludedInMenu.findIndex((roleId) => roleId === role.id)!,
						1,
					);
				} else {
					if (viewData.category.restrictToOneRole) {
						for (const memberRoleId of viewData.memberRolesIncludedInMenu) {
							removeRole(bot, guild.id, member.id, memberRoleId);
							displayData.roleData.memberRoleIds.splice(
								displayData.roleData.memberRoleIds.findIndex((roleId) => roleId === memberRoleId)!,
								1,
							);
						}
						viewData.memberRolesIncludedInMenu = [];
					} else if (
						viewData.category.limit !== undefined &&
						viewData.memberRolesIncludedInMenu.length >= viewData.category.limit
					) {
						sendInteractionResponse(
							bot,
							interaction.id,
							interaction.token,
							{
								type: InteractionResponseTypes.ChannelMessageWithSource,
								data: {
									flags: ApplicationCommandFlags.Ephemeral,
									embeds: [{
										description: localise(Commands.profile.options.roles.strings.reachedLimit, interaction.locale)(
											localise(viewData.category.name, interaction.locale),
										),
									}],
								},
							},
						);

						displayData = traverseRoleTreeAndDisplay(bot, interaction, displayData, true);
						return;
					}

					addRole(bot, guild.id, member.id, role.id, 'User-requested role addition.');
					displayData.roleData.memberRoleIds.push(role.id);
					displayData.viewData!.memberRolesIncludedInMenu.push(role.id);
				}

				displayData = traverseRoleTreeAndDisplay(bot, interaction, displayData, true);
			},
		},
	);

	let displayData = traverseRoleTreeAndDisplay(
		bot,
		interaction,
		{
			customId,
			browsingData: data,
			roleData: { emojiIdsByName, rolesByName, memberRoleIds: [...member.roles] },
		},
		false,
	);
}

interface RoleData {
	emojiIdsByName: Map<string, bigint>;
	rolesByName: Map<string, DiscordRole>;
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
	bot: Bot,
	interaction: Interaction,
	data: RoleDisplayData,
	editResponse = true,
): RoleDisplayData {
	const category = traverseRoleSelectionTree(data.browsingData.navigationData);

	let selectOptions: SelectOption[];
	if (category.type === RoleCategoryTypes.Category) {
		const menuRoles = resolveRoles(category.collection, data.browsingData.language);
		const menuRolesResolved = menuRoles.map((role) =>
			data.roleData.rolesByName.get(localise(role.name, defaultLocale))!
		);
		const memberRolesIncludedInMenu = data.roleData.memberRoleIds.filter(
			(roleId) => menuRolesResolved.some((role) => role.id === roleId),
		);

		data.viewData = { category, menuRoles, menuRolesResolved, memberRolesIncludedInMenu };

		selectOptions = createSelectOptionsFromCollection(data, interaction.locale);
	} else {
		if (data.viewData === undefined) {
			data.viewData = { category, menuRoles: [], menuRolesResolved: [], memberRolesIncludedInMenu: [] };
		}

		selectOptions = createSelectOptionsFromCategories(
			category.categories!,
			data.browsingData.language,
			interaction.locale,
		);
	}

	data.viewData!.category = category;

	const menu = displaySelectMenu(data, selectOptions, interaction.locale);

	if (editResponse) {
		editOriginalInteractionResponse(bot, interaction.token, menu.data!);
		return data;
	}

	sendInteractionResponse(bot, interaction.id, interaction.token, menu);
	return data;
}

function displaySelectMenu(
	data: RoleDisplayData,
	selectOptions: SelectOption[],
	locale: string | undefined,
): InteractionResponse {
	const isInRootCategory = data.browsingData.navigationData.indexesAccessed.length === 0;
	if (!isInRootCategory) {
		selectOptions.push({
			label: localise(Commands.profile.options.roles.strings.back, locale),
			value: `${-1}`,
		});
	}

	const category = data.viewData!.category;

	const categoryNameString = localise(category.name, locale);

	return {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				title: `${category.emoji}  ${categoryNameString}`,
				description: localise(category.description, locale),
				color: category.color,
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.SelectMenu,
					customId: data.customId,
					options: selectOptions,
					placeholder: category.type === RoleCategoryTypes.CategoryGroup
						? localise(Commands.profile.options.roles.strings.chooseCategory, locale)
						: localise(Commands.profile.options.roles.strings.chooseRole, locale),
				}],
			}],
		},
	};
}

function createSelectOptionsFromCategories(
	categories: RoleCategory[],
	language: Language | undefined,
	locale: string | undefined,
): SelectOption[] {
	const categorySelections = getRelevantCategories(categories, language);

	const selections: SelectOption[] = [];
	for (const [category, index] of categorySelections) {
		selections.push({
			label: localise(category.name, locale),
			value: index.toString(),
			description: trim(localise(category.description, locale), 100),
			emoji: { name: category.emoji },
		});
	}

	return selections;
}

const emojiExpression = /\p{Extended_Pictographic}/u;

function createSelectOptionsFromCollection(
	data: RoleDisplayData,
	locale: string | undefined,
): SelectOption[] {
	const selectOptions: SelectOption[] = [];

	const viewData = data.viewData!;

	const assignedString = localise(Commands.profile.options.roles.strings.assigned, locale);

	for (let index = 0; index < viewData.menuRoles.length; index++) {
		const [role, roleResolved] = [viewData.menuRoles.at(index)!, viewData.menuRolesResolved.at(index)!];
		const memberHasRole = viewData.memberRolesIncludedInMenu.includes(roleResolved.id);

		const localisedName = localise(role.name, locale);

		selectOptions.push({
			label: memberHasRole ? `[${assignedString}] ${localisedName}` : localisedName,
			value: index.toString(),
			description: role.description !== undefined ? localise(role.description, locale) : undefined,
			emoji: (() => {
				if (role.emoji === undefined) return;
				if (emojiExpression.test(role.emoji)) return { name: role.emoji };

				const id = data.roleData.emojiIdsByName.get(role.emoji);
				if (id === undefined) return { name: '❓' };

				return { name: role.emoji, id };
			})(),
		});
	}

	return selectOptions;
}

export default command;
