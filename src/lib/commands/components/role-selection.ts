import {
	Role,
	RoleCategory,
	RoleCategoryGroup,
	RoleCustom,
	RoleImplicit,
	getRoleCategories,
	getRoles,
	isCustom,
	isGroup,
	isSingle,
} from "logos:constants/roles";
import { trim } from "logos:core/formatting";
import { isDefined } from "logos:core/utilities";
import { Client } from "logos/client";
import { InteractionCollector } from "logos/collectors";

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
	 * A stack containing the identifiers accessed in succession to arrive at the
	 * current position in the role selection menu.
	 */
	identifiersAccessed: string[];
}

/**
 * Traverses the role category tree and returns the role category the user is
 * viewing currently.
 *
 * @param data - Navigation data for the selection menu.
 * @returns The category the user is now viewing.
 */
function traverseRoleSelectionTree(data: NavigationData): [RoleCategory, ...RoleCategory[]] {
	return data.identifiersAccessed.reduce<[RoleCategory, ...RoleCategory[]]>(
		(categories, next) => {
			const lastCategoryGroup = categories.at(-1) as RoleCategoryGroup | undefined;
			if (lastCategoryGroup === undefined) {
				throw "StateError: Could not get the last role category group when traversing the role selection tree.";
			}

			const lastCategory = lastCategoryGroup.categories[next];
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
	const guild = client.entities.guilds.get(interaction.guildId);
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

	const member = client.entities.members.get(guild.id)?.get(interaction.user.id);
	if (member === undefined) {
		return;
	}

	const rolesById = new Map(guild.roles.array().map((role) => [role.id, role]));

	const selectionMenuSelection = new InteractionCollector(client, { only: [interaction.user.id] });

	selectionMenuSelection.onInteraction(async (selection) => {
		await client.acknowledge(selection);

		const identifier = selection.data?.values?.at(0);
		if (identifier === undefined) {
			return;
		}

		if (identifier === constants.special.roles.back) {
			data.navigationData.identifiersAccessed.pop();
			displayData = await traverseRoleTreeAndDisplay(client, selection, displayData, { editResponse: true });
			return;
		}

		const viewData = displayData.viewData;
		if (viewData === undefined) {
			return;
		}

		if (isGroup(viewData.category)) {
			data.navigationData.identifiersAccessed.push(identifier);
			displayData = await traverseRoleTreeAndDisplay(client, selection, displayData, { editResponse: true });
			return;
		}

		const role = viewData.menuRolesResolved[identifier];
		if (role === undefined) {
			return;
		}

		const alreadyHasRole = viewData.memberRolesIncludedInMenu.includes(role.id);

		if (alreadyHasRole) {
			if (
				viewData.category.minimum !== undefined &&
				viewData.memberRolesIncludedInMenu.length <= viewData.category.minimum
			) {
				displayData = await traverseRoleTreeAndDisplay(client, interaction, displayData, {
					editResponse: true,
				});
				return;
			}

			client.bot.helpers
				.removeRole(guild.id, member.id, role.id, "User-requested role removal.")
				.catch(() =>
					client.log.warn(
						`Failed to remove ${client.diagnostics.role(role)} from ${client.diagnostics.member(
							member,
						)} on ${client.diagnostics.guild(guild)}.`,
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
				const strings = constants.contexts.roleLimitReached({
					localise: client.localise.bind(client),
					locale: interaction.locale,
				});

				await client.notice(interaction, {
					title: strings.title,
					description: `${strings.description.limitReached}\n\n${strings.description.toChooseNew}`,
				});

				displayData = await traverseRoleTreeAndDisplay(client, interaction, displayData, {
					editResponse: true,
				});

				return;
			}

			await client.bot.helpers
				.addRole(guild.id, member.id, role.id, "User-requested role addition.")
				.catch(() =>
					client.log.warn(
						`Failed to add ${client.diagnostics.role(role)} to ${client.diagnostics.member(
							member,
						)} on ${client.diagnostics.guild(guild)}.`,
					),
				);

			if (viewData.category.maximum === 1) {
				for (const memberRoleId of viewData.memberRolesIncludedInMenu) {
					client.bot.helpers
						.removeRole(guild.id, member.id, memberRoleId)
						.catch(() =>
							client.log.warn(
								`Failed to remove ${client.diagnostics.role(role)} from ${client.diagnostics.member(
									member,
								)} on ${client.diagnostics.guild(guild)}.`,
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

		displayData = await traverseRoleTreeAndDisplay(client, interaction, displayData, { editResponse: true });
	});

	await client.registerInteractionCollector(selectionMenuSelection);

	let displayData = await traverseRoleTreeAndDisplay(
		client,
		interaction,
		{
			customId: selectionMenuSelection.customId,
			browsingData: data,
			roleData: { emojiIdsByName, rolesById, memberRoleIds: [...member.roles] },
		},
		{ editResponse: false },
	);
}

interface RoleData {
	emojiIdsByName: Map<string, bigint>;
	rolesById: Map<bigint, Logos.Role>;
	memberRoleIds: bigint[];
}

interface ViewData {
	category: RoleCategory;
	menuRoles: Record<string, Role>;
	menuRolesResolved: Record<string, Logos.Role | undefined>;
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
): Promise<RoleDisplayData> {
	const categories = traverseRoleSelectionTree(data.browsingData.navigationData);
	const category = categories.at(-1);
	if (category === undefined) {
		throw "StateError: Could not get the last role category.";
	}

	let selectOptions: Discord.SelectOption[];
	if (isSingle(category)) {
		const menuRoles = getRoles(category.collection, data.browsingData.guildId);
		const snowflakes = ((): [string, bigint][] => {
			const collection = category.collection;
			if (isCustom(collection)) {
				return (Object.entries(menuRoles) as [string, RoleCustom][]).map(([name, role]) => [
					name,
					BigInt(role.snowflake),
				]);
			}

			return (Object.entries(menuRoles) as [string, RoleImplicit][]).map(([name, role]) => {
				const snowflake = role.snowflakes[interaction.guildId.toString()];
				if (snowflake === undefined) {
					throw `StateError: Could not get the snowflake for a role on ${client.diagnostics.guild(
						interaction.guildId,
					)}.`;
				}

				return [name, BigInt(snowflake)];
			});
		})();
		const menuRolesResolved = Object.fromEntries(
			snowflakes.map<[string, Logos.Role | undefined]>(([name, snowflake]) => [
				name,
				data.roleData.rolesById.get(snowflake),
			]),
		);
		const memberRolesIncludedInMenu = Object.values(menuRolesResolved)
			.filter(isDefined)
			.filter((role) => data.roleData.memberRoleIds.some((roleId) => role.id === roleId))
			.map((role) => role.id);

		data.viewData = { category, menuRoles, menuRolesResolved, memberRolesIncludedInMenu };

		selectOptions = createSelectOptionsFromCollection(client, interaction, data);
	} else {
		if (data.viewData === undefined) {
			data.viewData = { category, menuRoles: {}, menuRolesResolved: {}, memberRolesIncludedInMenu: [] };
		}

		selectOptions = createSelectOptionsFromCategories(
			client,
			interaction,
			category.categories,
			data.browsingData.guildId,
		);
	}

	data.viewData.category = category;

	const menu = await displaySelectMenu(client, interaction, data, categories, selectOptions);

	if (editResponse) {
		await client.editReply(interaction, menu);

		return data;
	}

	await client.reply(interaction, menu);

	return data;
}

async function displaySelectMenu(
	client: Client,
	interaction: Logos.Interaction,
	data: RoleDisplayData,
	categories: [RoleCategory, ...RoleCategory[]],
	selectOptions: Discord.SelectOption[],
): Promise<Discord.InteractionCallbackData> {
	const isInRootCategory = data.browsingData.navigationData.identifiersAccessed.length === 0;
	if (!isInRootCategory) {
		const strings = constants.contexts.previousRoleCategory({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});

		selectOptions.push({ label: trim(strings.back, 25), value: constants.special.roles.back });
	}

	const category = categories.at(-1);
	if (category === undefined) {
		throw "StateError: Could not get the last role category.";
	}

	const strings = {
		...constants.contexts.roleMenu({ localise: client.localise.bind(client), locale: interaction.locale }),
		...constants.contexts.role({
			localise: client.localise.bind(client),
			localiseRaw: client.localiseRaw.bind(client),
			locale: interaction.locale,
		}),
	};
	const title = (categories.length > 1 ? categories.slice(1) : categories)
		.map((category) => `${category.emoji}  ${strings.name({ id: category.id })}`)
		.join(` ${constants.emojis.indicators.arrowRight}  `);

	return {
		embeds: [
			{
				title,
				description: strings.description({ id: category.id }),
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
	interaction: Logos.Interaction,
	categories: Record<string, RoleCategory>,
	guildId: bigint,
): Discord.SelectOption[] {
	const categorySelections = getRoleCategories(categories, guildId);

	const selections: Discord.SelectOption[] = [];
	for (const [name, category] of Object.entries(categorySelections)) {
		const strings = constants.contexts.roleCategory({
			localise: client.localise.bind(client),
			locale: interaction.locale,
		});
		selections.push({
			label: trim(`${category.emoji} ${strings.name({ id: category.id })}`, 25),
			value: name,
			description: trim(strings.description({ id: category.id }), 100),
			emoji: { name: constants.emojis.roles.folder },
		});
	}

	return selections;
}

function createSelectOptionsFromCollection(
	client: Client,
	interaction: Logos.Interaction,
	data: RoleDisplayData,
): Discord.SelectOption[] {
	const selectOptions: Discord.SelectOption[] = [];

	const viewData = data.viewData;
	if (viewData === undefined) {
		return [{ label: "?", value: constants.components.none }];
	}

	for (const name of Object.keys(viewData.menuRoles)) {
		const [role, roleResolved] = [viewData.menuRoles[name], viewData.menuRolesResolved[name]];
		if (role === undefined || roleResolved === undefined) {
			continue;
		}

		const memberHasRole = viewData.memberRolesIncludedInMenu.includes(roleResolved.id);

		const strings = {
			...constants.contexts.assignedRoles({ localise: client.localise.bind(client), locale: interaction.locale }),
			...constants.contexts.role({
				localise: client.localise.bind(client),
				localiseRaw: client.localiseRaw.bind(client),
				locale: interaction.locale,
			}),
		};
		selectOptions.push({
			label: trim(
				memberHasRole
					? `[${strings.assigned}] ${strings.name({ id: role.id })}`
					: strings.name({ id: role.id }),
				25,
			),
			value: name,
			description:
				strings.description({ id: role.id }) !== undefined
					? trim(strings.description({ id: role.id })!, 100)
					: undefined,
			emoji: (() => {
				if (role.emoji === undefined) {
					return;
				}

				if (constants.patterns.emojiExpression.test(role.emoji)) {
					return { name: role.emoji };
				}

				const id = data.roleData.emojiIdsByName.get(role.emoji);
				if (id === undefined) {
					return { name: constants.emojis.roles.noCategory };
				}

				return { name: role.emoji, id };
			})(),
		});
	}

	return selectOptions;
}

export { createRoleSelectionMenu };
