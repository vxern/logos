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
import { Commands, createLocalisations, localise } from '../../../../../assets/localisations/mod.ts';
import { Client, configuration, createInteractionCollector, defaultLanguage, Language } from '../../../../mod.ts';
import { OptionBuilder } from '../../../mod.ts';
import {
	createSelectOptionsFromCategories,
	createSelectOptionsFromCollection,
	getRelevantCategories,
	resolveRoles,
	Role,
	RoleCategory,
	RoleCategoryTypes,
} from '../../data/structures/mod.ts';
import { roles } from '../../data/mod.ts';

const command: OptionBuilder = {
	...createLocalisations(Commands.profile.options.roles),
	type: ApplicationCommandOptionTypes.SubCommand,
	handle: selectRoles,
};

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 */
function selectRoles(
	[client, bot]: [Client, Bot],
	interaction: Interaction,
): void {
	const guild = client.cache.guilds.get(interaction.guildId!);
	if (!guild) return;

	const rootCategories = getRelevantCategories(roles, guild.language).map((
		[category, _index],
	) => category);

	return createRoleSelectionMenu(
		[client, bot],
		interaction,
		{
			navigationData: {
				root: {
					type: RoleCategoryTypes.CategoryGroup,
					name: Commands.profile.options.roles.strings.selectCategory.header,
					description: Commands.profile.options.roles.strings.selectCategory.body,
					color: configuration.interactions.responses.colors.invisible,
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
function traverseRoleSelectionTree(
	data: NavigationData,
): CategoryGroupRoleCategory {
	return data.indexesAccessed.reduce(
		(category, next) => <CategoryGroupRoleCategory> category.categories.at(next)!,
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
	if (!guild) return;

	const emojiIdsByName = new Map(
		guild.emojis.map((emoji) => [emoji.name!, emoji.id!]),
	);

	const member = client.cache.members.get(
		snowflakeToBigint(`${interaction.user.id}${guild.id}`),
	);
	if (!member) return;

	const memberRoleIds = [...member.roles];
	const rolesByName = new Map(
		guild.roles.array().map((role) => [role.name, role]),
	);

	let category: RoleCategory;
	let menuRoles: Role[];
	let menuRolesResolved: DiscordRole[];
	let memberRolesIncludedInMenu: bigint[];

	const traverseRoleTreeAndDisplay = (
		interaction: Interaction,
		editResponse = true,
	): void => {
		category = traverseRoleSelectionTree(data.navigationData);

		if (category.type === RoleCategoryTypes.Category) {
			menuRoles = resolveRoles(category.collection, data.language);
			menuRolesResolved = menuRoles.map((role) => rolesByName.get(localise(role.name, defaultLanguage))!);
			memberRolesIncludedInMenu = memberRoleIds.filter((roleId) =>
				menuRolesResolved.some((role) => role.id === roleId)
			);
		}

		let selectOptions: SelectOption[];
		if (category.type === RoleCategoryTypes.CategoryGroup) {
			selectOptions = createSelectOptionsFromCategories(
				category.categories!,
				data.language,
				interaction.locale,
			);
		} else {
			selectOptions = createSelectOptionsFromCollection(
				menuRoles,
				menuRolesResolved,
				memberRolesIncludedInMenu,
				emojiIdsByName,
				interaction.locale,
			);
		}

		const menu = displaySelectMenu(
			selectOptions,
			data,
			customId,
			category,
			interaction.locale,
		);

		if (editResponse) {
			return void editOriginalInteractionResponse(
				bot,
				interaction.token,
				menu.data!,
			);
		}

		return void sendInteractionResponse(
			bot,
			interaction.id,
			interaction.token,
			menu,
		);
	};

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
				if (!indexString) return;

				const index = Number(indexString);
				if (isNaN(index)) return;

				if (index === -1) {
					data.navigationData.indexesAccessed.pop();
					return traverseRoleTreeAndDisplay(selection);
				}

				if (category.type === RoleCategoryTypes.CategoryGroup) {
					data.navigationData.indexesAccessed.push(index);
					return traverseRoleTreeAndDisplay(selection);
				}

				const role = menuRolesResolved.at(index)!;

				const alreadyHasRole = memberRolesIncludedInMenu.includes(role.id);

				if (alreadyHasRole) {
					removeRole(
						bot,
						guild.id,
						member.id,
						role.id,
						'User-requested role removal.',
					);
					memberRoleIds.splice(
						memberRoleIds.findIndex((roleId) => roleId === role.id)!,
						1,
					);
					memberRolesIncludedInMenu.splice(
						memberRolesIncludedInMenu.findIndex((roleId) => roleId === role.id)!,
						1,
					);
				} else {
					if (category.restrictToOneRole) {
						for (const memberRoleId of memberRolesIncludedInMenu) {
							removeRole(bot, guild.id, member.id, memberRoleId);
							memberRoleIds.splice(
								memberRoleIds.findIndex((roleId) => roleId === memberRoleId)!,
								1,
							);
						}
						memberRolesIncludedInMenu = [];
					} else if (
						category.limit &&
						memberRolesIncludedInMenu.length >= category.limit
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
										description: localise(
											Commands.profile.options.roles.strings.reachedLimit,
											interaction.locale,
										)(localise(category.name, interaction.locale)),
									}],
								},
							},
						);

						return traverseRoleTreeAndDisplay(interaction, true);
					}

					addRole(
						bot,
						guild.id,
						member.id,
						role.id,
						'User-requested role addition.',
					);
					memberRoleIds.push(role.id);
					memberRolesIncludedInMenu.push(role.id);
				}

				traverseRoleTreeAndDisplay(interaction, true);
			},
		},
	);

	return traverseRoleTreeAndDisplay(interaction, false);
}

/**
 * Creates a selection menu and returns its object.
 *
 * @param selectOptions - The options to display in the selection menu.
 * @param data - The data used for displaying the selection menu.
 * @param customId - The ID of the selection menu.
 * @param category - The role category shown.
 * @returns A promise resolving to an interaction response.
 */
function displaySelectMenu(
	selectOptions: SelectOption[],
	data: BrowsingData,
	customId: string,
	category: RoleCategory,
	locale: string | undefined,
): InteractionResponse {
	const isInRootCategory = data.navigationData.indexesAccessed.length === 0;

	if (!isInRootCategory) {
		selectOptions.push({
			label: localise(Commands.profile.options.roles.strings.back, locale),
			value: `${-1}`,
		});
	}

	return {
		type: InteractionResponseTypes.ChannelMessageWithSource,
		data: {
			flags: ApplicationCommandFlags.Ephemeral,
			embeds: [{
				title: `${category.emoji}  ${localise(category.name, locale)}`,
				description: localise(category.description, locale),
				color: category.color,
			}],
			components: [{
				type: MessageComponentTypes.ActionRow,
				components: [{
					type: MessageComponentTypes.SelectMenu,
					customId: customId,
					options: selectOptions,
					placeholder: category.type === RoleCategoryTypes.CategoryGroup
						? localise(
							Commands.profile.options.roles.strings.chooseCategory,
							locale,
						)
						: localise(
							Commands.profile.options.roles.strings.chooseRole,
							locale,
						),
				}],
			}],
		},
	};
}

export default command;
