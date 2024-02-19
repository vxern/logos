import * as Discord from "@discordeno/bot";
import constants from "../../../../../constants/constants";
import { Locale } from "../../../../../constants/languages";
import { trim } from "../../../../../formatting";
import * as Logos from "../../../../../types";
import { Client, InteractionCollector } from "../../../../client";
import diagnostics from "../../../../diagnostics";
import { OptionTemplate } from "../../../command";
import roles, { getRoleCategories, getRoles } from "../../roles/roles";
import {
	Role,
	RoleCategory,
	RoleCategoryGroup,
	RoleCustom,
	RoleImplicit,
	isCustom,
	isGroup,
	isSingle,
} from "../../roles/types";

const command: OptionTemplate = {
	id: "roles",
	type: Discord.ApplicationCommandOptionTypes.SubCommand,
	handle: handleOpenRoleSelectionMenu,
};

/**
 * Displays a role selection menu to the user and allows them to assign or unassign roles
 * from within it.
 */
async function handleOpenRoleSelectionMenu(client: Client, interaction: Logos.Interaction): Promise<void> {
	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const rootCategories = getRoleCategories(roles, guild.id).map(([category, _index]) => category);

	createRoleSelectionMenu(client, interaction, {
		navigationData: {
			root: {
				type: "group",
				id: "roles.noCategory",
				color: constants.colors.invisible,
				emoji: constants.symbols.roles.noCategory,
				categories: rootCategories,
			},
			indexesAccessed: [],
		},
		guildId: guild.id,
	});
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
			const lastCategoryGroup = categories.at(-1) as RoleCategoryGroup | undefined;
			if (lastCategoryGroup === undefined) {
				throw "StateError: Could not get the last role category group when traversing the role selection tree.";
			}

			const lastCategory = lastCategoryGroup.categories.at(next);
			if (lastCategory === undefined) {
				throw "StateError: Could not get the last role category when traversing the role selection tree.";
			}

			categories.push(lastCategory);
			return categories;
		},
		[data.root],
	);
}

/**
 * Creates a browsing menu for selecting roles.
 */
async function createRoleSelectionMenu(
	client: Client,
	interaction: Logos.Interaction,
	data: BrowsingData,
): Promise<void> {
	const locale = interaction.locale;

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		return;
	}

	const guild = client.entities.guilds.get(guildId);
	if (guild === undefined) {
		return;
	}

	const emojiIdsByName = new Map<string, bigint>();
	for (const emoji of guild.emojis.values()) {
		const { name, id } = emoji;
		if (name === undefined || id === undefined) {
			continue;
		}
		emojiIdsByName.set(name, id);
	}

	const member = client.entities.members.get(Discord.snowflakeToBigint(`${interaction.user.id}${guild.id}`));
	if (member === undefined) {
		return;
	}

	const rolesById = new Map(guild.roles.array().map((role) => [role.id, role]));

	const selectionMenuSelection = new InteractionCollector(client, { only: [interaction.user.id], isSingle: true });

	selectionMenuSelection.onCollect(async (selection) => {
		client.acknowledge(selection);

		const indexString = selection.data?.values?.at(0);
		if (indexString === undefined) {
			return;
		}

		const index = Number(indexString);
		if (!Number.isSafeInteger(index)) {
			return;
		}

		if (index === -1) {
			data.navigationData.indexesAccessed.pop();
			displayData = await traverseRoleTreeAndDisplay(
				client,
				selection,
				displayData,
				{ editResponse: true },
				{ locale },
			);
			return;
		}

		const viewData = displayData.viewData;
		if (viewData === undefined) {
			return;
		}

		if (isGroup(viewData.category)) {
			data.navigationData.indexesAccessed.push(index);
			displayData = await traverseRoleTreeAndDisplay(
				client,
				selection,
				displayData,
				{ editResponse: true },
				{ locale },
			);
			return;
		}

		const role = viewData.menuRolesResolved.at(index);
		if (role === undefined) {
			return;
		}

		const alreadyHasRole = viewData.memberRolesIncludedInMenu.includes(role.id);

		if (alreadyHasRole) {
			if (
				viewData.category.minimum !== undefined &&
				viewData.memberRolesIncludedInMenu.length <= viewData.category.minimum
			) {
				displayData = await traverseRoleTreeAndDisplay(
					client,
					interaction,
					displayData,
					{ editResponse: true },
					{ locale },
				);
				return;
			}

			client.bot.rest
				.removeRole(guild.id, member.id, role.id, "User-requested role removal.")
				.catch(() =>
					client.log.warn(
						`Failed to remove ${diagnostics.display.role(role)} from ${diagnostics.display.member(
							member,
						)} on ${diagnostics.display.guild(guild)}.`,
					),
				);

			const roleIndex = displayData.roleData.memberRoleIds.findIndex((roleId) => roleId === role.id);
			const roleInMenuIndex = viewData.memberRolesIncludedInMenu.findIndex((roleId) => roleId === role.id);
			if (roleIndex !== undefined && roleInMenuIndex !== undefined) {
				displayData.roleData.memberRoleIds.splice(roleIndex, 1);
				viewData.memberRolesIncludedInMenu.splice(roleInMenuIndex, 1);
			}
		} else {
			if (
				viewData.category.maximum !== undefined &&
				viewData.category.maximum !== 1 &&
				viewData.memberRolesIncludedInMenu.length >= viewData.category.maximum
			) {
				const strings = {
					title: client.localise("warn.strings.limitReached.title", locale)(),
					description: {
						limitReached: client.localise(
							"profile.options.roles.strings.limitReached.description.limitReached",
							locale,
						)({ category: client.localise(`${viewData.category.id}.name`, locale)() }),
						toChooseNew: client.localise(
							"profile.options.roles.strings.limitReached.description.toChooseNew",
							locale,
						)(),
					},
				};

				client.reply(interaction, {
					embeds: [
						{
							title: strings.title,
							description: `${strings.description.limitReached}\n\n${strings.description.toChooseNew}`,
						},
					],
				});

				displayData = await traverseRoleTreeAndDisplay(
					client,
					interaction,
					displayData,
					{ editResponse: true },
					{ locale },
				);
				return;
			}

			await client.bot.rest
				.addRole(guild.id, member.id, role.id, "User-requested role addition.")
				.catch(() =>
					client.log.warn(
						`Failed to add ${diagnostics.display.role(role)} to ${diagnostics.display.member(
							member,
						)} on ${diagnostics.display.guild(guild)}.`,
					),
				);

			if (viewData.category.maximum === 1) {
				for (const memberRoleId of viewData.memberRolesIncludedInMenu) {
					client.bot.rest
						.removeRole(guild.id, member.id, memberRoleId)
						.catch(() =>
							client.log.warn(
								`Failed to remove ${diagnostics.display.role(role)} from ${diagnostics.display.member(
									member,
								)} on ${diagnostics.display.guild(guild)}.`,
							),
						);

					const roleId = displayData.roleData.memberRoleIds.findIndex((roleId) => roleId === memberRoleId);

					displayData.roleData.memberRoleIds.splice(roleId, 1);
				}
				viewData.memberRolesIncludedInMenu = [];
			}

			displayData.roleData.memberRoleIds.push(role.id);
			displayData.viewData?.memberRolesIncludedInMenu.push(role.id);
		}

		displayData = await traverseRoleTreeAndDisplay(
			client,
			interaction,
			displayData,
			{ editResponse: true },
			{ locale },
		);
	});

	client.registerInteractionCollector(selectionMenuSelection);

	let displayData = await traverseRoleTreeAndDisplay(
		client,
		interaction,
		{
			customId: selectionMenuSelection.customId,
			browsingData: data,
			roleData: { emojiIdsByName, rolesById, memberRoleIds: [...member.roles] },
		},
		{ editResponse: false },
		{ locale },
	);
}

interface RoleData {
	emojiIdsByName: Map<string, bigint>;
	rolesById: Map<bigint, Logos.Role>;
	memberRoleIds: bigint[];
}

interface ViewData {
	category: RoleCategory;
	menuRoles: Role[];
	menuRolesResolved: (Logos.Role | undefined)[];
	memberRolesIncludedInMenu: bigint[];
}

interface RoleDisplayData {
	readonly customId: string;

	browsingData: BrowsingData;
	roleData: RoleData;
	viewData?: ViewData;
}

async function traverseRoleTreeAndDisplay(
	client: Client,
	interaction: Logos.Interaction,
	data: RoleDisplayData,
	{ editResponse }: { editResponse: boolean },
	{ locale }: { locale: Locale },
): Promise<RoleDisplayData> {
	const categories = traverseRoleSelectionTree(data.browsingData.navigationData);
	const category = categories.at(-1);
	if (category === undefined) {
		throw "StateError: Could not get the last role category.";
	}

	const guildId = interaction.guildId;
	if (guildId === undefined) {
		throw "StateError: The guild ID was unexpectedly `undefined`.";
	}

	let selectOptions: Discord.SelectOption[];
	if (isSingle(category)) {
		const menuRoles = getRoles(category.collection, data.browsingData.guildId);
		const snowflakes = (() => {
			const collection = category.collection;
			if (isCustom(collection)) {
				return (menuRoles as RoleCustom[]).map((role) => BigInt(role.snowflake));
			}

			const guildIdString = guildId.toString();
			return (menuRoles as RoleImplicit[]).map((role) => {
				const snowflake = role.snowflakes[guildIdString];
				if (snowflake === undefined) {
					throw `StateError: Could not get the snowflake for a role on ${diagnostics.display.guild(guildIdString)}.`;
				}
				return BigInt(snowflake);
			});
		})();
		const menuRolesResolved = snowflakes.map((snowflake) => data.roleData.rolesById.get(snowflake));
		const memberRolesIncludedInMenu = data.roleData.memberRoleIds.filter((roleId) =>
			menuRolesResolved.some((role) => role?.id === roleId),
		);

		data.viewData = { category, menuRoles, menuRolesResolved, memberRolesIncludedInMenu };

		selectOptions = createSelectOptionsFromCollection(client, data, { locale });
	} else {
		if (data.viewData === undefined) {
			data.viewData = { category, menuRoles: [], menuRolesResolved: [], memberRolesIncludedInMenu: [] };
		}

		selectOptions = createSelectOptionsFromCategories(client, category.categories, data.browsingData.guildId, {
			locale,
		});
	}

	data.viewData.category = category;

	const menu = await displaySelectMenu(client, data, categories, selectOptions, { locale });

	if (editResponse) {
		client.editReply(interaction, menu);

		return data;
	}

	client.reply(interaction, menu);

	return data;
}

async function displaySelectMenu(
	client: Client,
	data: RoleDisplayData,
	categories: [RoleCategory, ...RoleCategory[]],
	selectOptions: Discord.SelectOption[],
	{ locale }: { locale: Locale },
): Promise<Discord.InteractionCallbackData> {
	const isInRootCategory = data.browsingData.navigationData.indexesAccessed.length === 0;
	if (!isInRootCategory) {
		const strings = {
			back: client.localise("profile.options.roles.strings.back", locale)(),
		};

		selectOptions.push({ label: trim(strings.back, 25), value: `${-1}` });
	}

	const category = categories.at(-1);
	if (category === undefined) {
		throw "StateError: Could not get the last role category.";
	}

	const title = (categories.length > 1 ? categories.slice(1) : categories)
		.map((category) => {
			const strings = {
				categoryName: client.localise(`${category.id}.name`, locale)(),
			};

			return `${category.emoji}  ${strings.categoryName}`;
		})
		.join(` ${constants.symbols.indicators.arrowRight}  `);

	const strings = {
		description: client.localise(`${category.id}.description`, locale)(),
		chooseCategory: client.localise("profile.options.roles.strings.chooseCategory", locale)(),
		chooseRole: client.localise("profile.options.roles.strings.chooseRole", locale)(),
	};

	return {
		embeds: [
			{
				title,
				description: strings.description,
				color: category.color,
			},
		],
		components: [
			{
				type: Discord.MessageComponentTypes.ActionRow,
				components: [
					{
						type: Discord.MessageComponentTypes.SelectMenu,
						customId: data.customId,
						options: selectOptions,
						placeholder: isGroup(category) ? strings.chooseCategory : strings.chooseRole,
					},
				],
			},
		],
	};
}

function createSelectOptionsFromCategories(
	client: Client,
	categories: RoleCategory[],
	guildId: bigint,
	{ locale }: { locale: Locale },
): Discord.SelectOption[] {
	const categorySelections = getRoleCategories(categories, guildId);

	const selections: Discord.SelectOption[] = [];
	for (const [category, index] of categorySelections) {
		const strings = {
			name: client.localise(`${category.id}.name`, locale)(),
			description: client.localise(`${category.id}.description`, locale)(),
		};

		selections.push({
			label: trim(`${category.emoji} ${strings.name}`, 25),
			value: index.toString(),
			description: trim(strings.description, 100),
			emoji: { name: constants.symbols.roles.folder },
		});
	}

	return selections;
}

const emojiExpression = /\p{Extended_Pictographic}/u;

function createSelectOptionsFromCollection(
	client: Client,
	data: RoleDisplayData,
	{ locale }: { locale: Locale },
): Discord.SelectOption[] {
	const selectOptions: Discord.SelectOption[] = [];

	const viewData = data.viewData;
	if (viewData === undefined) {
		return [{ label: "?", value: constants.components.none }];
	}

	for (const index of Array(viewData.menuRoles.length).keys()) {
		const [role, roleResolved] = [viewData.menuRoles.at(index), viewData.menuRolesResolved.at(index)];
		if (role === undefined || roleResolved === undefined) {
			continue;
		}

		const memberHasRole = viewData.memberRolesIncludedInMenu.includes(roleResolved.id);

		const strings = {
			assigned: client.localise("profile.options.roles.strings.assigned", locale)(),
			name: client.localise(`${role.id}.name`, locale)(),
			description: client.localiseUnsafe(`${role.id}.description`, locale),
		};

		selectOptions.push({
			label: trim(memberHasRole ? `[${strings.assigned}] ${strings.name}` : strings.name, 25),
			value: index.toString(),
			description: strings.description !== undefined ? trim(strings.description(), 100) : undefined,
			emoji: (() => {
				if (role.emoji === undefined) {
					return;
				}

				if (emojiExpression.test(role.emoji)) {
					return { name: role.emoji };
				}

				const id = data.roleData.emojiIdsByName.get(role.emoji);
				if (id === undefined) {
					return { name: constants.symbols.roles.noCategory };
				}

				return { name: role.emoji, id };
			})(),
		});
	}

	return selectOptions;
}

export default command;
export { handleOpenRoleSelectionMenu };
