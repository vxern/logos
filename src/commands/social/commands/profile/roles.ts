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
import { OptionTemplate } from 'logos/src/commands/command.ts';
import roles from 'logos/src/commands/social/data/roles.ts';
import {
	isCategory,
	isCategoryGroup,
	Role,
	RoleCategory,
	RoleCategoryTypes,
} from 'logos/src/commands/social/data/types.ts';
import { getRelevantCategories, resolveRoles } from 'logos/src/commands/social/module.ts';
import { Client, localise } from 'logos/src/client.ts';
import { createInteractionCollector } from 'logos/src/interactions.ts';
import constants from 'logos/constants.ts';
import { trim } from 'logos/formatting.ts';
import { defaultLocale, Language } from 'logos/types.ts';

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

	const rootCategories = getRelevantCategories(roles, guild.language).map(([category, _index]) => category);

	return createRoleSelectionMenu(
		[client, bot],
		interaction,
		{
			navigationData: {
				root: {
					type: RoleCategoryTypes.CategoryGroup,
					id: 'roles.noCategory',
					color: constants.colors.invisible,
					emoji: constants.symbols.roles.noCategory,
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
function traverseRoleSelectionTree(data: NavigationData): [RoleCategory, ...RoleCategory[]] {
	return data.indexesAccessed.reduce<[RoleCategory, ...RoleCategory[]]>(
		(categories, next) => {
			categories.push((categories.at(-1)! as CategoryGroupRoleCategory).categories.at(next)!);
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

	const rolesByName = new Map(guild.roles.array().map((role) => [role.name, role]));

	const customId = createInteractionCollector(
		[client, bot],
		{
			type: InteractionTypes.MessageComponent,
			userId: interaction.user.id,
			onCollect: async (bot, selection) => {
				sendInteractionResponse(bot, selection.id, selection.token, {
					type: InteractionResponseTypes.DeferredUpdateMessage,
				});

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

				if (isCategoryGroup(viewData.category)) {
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

						sendInteractionResponse(
							bot,
							interaction.id,
							interaction.token,
							{
								type: InteractionResponseTypes.ChannelMessageWithSource,
								data: {
									flags: ApplicationCommandFlags.Ephemeral,
									embeds: [{
										title: strings.title,
										description: `${strings.description.limitReached}\n\n${strings.description.toChooseNew}`,
									}],
								},
							},
						);

						displayData = traverseRoleTreeAndDisplay([client, bot], interaction, displayData, true);
						return;
					}

					await addRole(bot, guild.id, member.id, role.id, 'User-requested role addition.');

					if (viewData.category.maximum === 1) {
						for (const memberRoleId of viewData.memberRolesIncludedInMenu) {
							removeRole(bot, guild.id, member.id, memberRoleId);
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
	[client, bot]: [Client, Bot],
	interaction: Interaction,
	data: RoleDisplayData,
	editResponse = true,
): RoleDisplayData {
	const categories = traverseRoleSelectionTree(data.browsingData.navigationData);
	const category = categories.at(-1)!;

	let selectOptions: SelectOption[];
	if (isCategory(category)) {
		const menuRoles = resolveRoles(category.collection, data.browsingData.language);
		const menuRolesResolved = menuRoles.map((role) => {
			const strings = {
				name: localise(client, `${role.id}.name`, defaultLocale)(),
			};

			return data.roleData.rolesByName.get(strings.name)!;
		});
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
			data.browsingData.language,
			interaction.locale,
		);
	}

	data.viewData!.category = category;

	const menu = displaySelectMenu(client, data, categories, selectOptions, interaction.locale);

	if (editResponse) {
		editOriginalInteractionResponse(bot, interaction.token, menu.data!);
		return data;
	}

	sendInteractionResponse(bot, interaction.id, interaction.token, menu);
	return data;
}

function displaySelectMenu(
	client: Client,
	data: RoleDisplayData,
	categories: [RoleCategory, ...RoleCategory[]],
	selectOptions: SelectOption[],
	locale: string | undefined,
): InteractionResponse {
	const isInRootCategory = data.browsingData.navigationData.indexesAccessed.length === 0;
	if (!isInRootCategory) {
		const strings = {
			back: localise(client, 'profile.options.roles.strings.back', locale)(),
		};

		selectOptions.push({ label: strings.back, value: `${-1}` });
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
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
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
					placeholder: isCategoryGroup(category) ? strings.chooseCategory : strings.chooseRole,
				}],
			}],
		},
	};
}

function createSelectOptionsFromCategories(
	client: Client,
	categories: RoleCategory[],
	language: Language | undefined,
	locale: string | undefined,
): SelectOption[] {
	const categorySelections = getRelevantCategories(categories, language);

	const selections: SelectOption[] = [];
	for (const [category, index] of categorySelections) {
		const strings = {
			name: localise(client, `${category.id}.name`, locale)(),
			description: localise(client, `${category.id}.description`, locale)(),
		};

		selections.push({
			label: `${category.emoji} ${strings.name}`,
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

	for (let index = 0; index < viewData.menuRoles.length; index++) {
		const [role, roleResolved] = [viewData.menuRoles.at(index)!, viewData.menuRolesResolved.at(index)!];
		const memberHasRole = viewData.memberRolesIncludedInMenu.includes(roleResolved.id);

		const strings = {
			assigned: localise(client, 'profile.options.roles.strings.assigned', locale)(),
			name: localise(client, `${role.id}.name`, locale)(),
			description: localise(client, `${role.id}.description`, locale),
		};

		selectOptions.push({
			label: memberHasRole ? `[${strings.assigned}] ${strings.name}` : strings.name,
			value: index.toString(),
			description: client.localisations.has(`${role.id}.description`) ? strings.description() : undefined,
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
