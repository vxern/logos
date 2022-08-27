import { SelectOption } from '../../../../../deps.ts';
import { Language } from '../../../../types.ts';
import { trim } from '../../../../utils.ts';
import { Assignable } from './role.ts';
import { RoleCollection, RoleCollectionTypes } from './role-collection.ts';

/** The type of a role category. */
enum RoleCategoryTypes {
	Category,
	CategoryGroup,
}

/** Represents a thematic selection of {@link Role}s. */
type RoleCategory =
	& {
		/** The type of this category. */
		type: RoleCategoryTypes;

		/** The name of this category. */
		name: string;

		/** The description for the roles contained within this category. */
		description: string;

		/** The colour to be displayed in the embed message when this category is selected. */
		color: number;

		/** The emoji to be displayed next to this category in a selection menu. */
		emoji: string;
	}
	& (
		| {
			type: RoleCategoryTypes.CategoryGroup;

			/** The subcategories of this category. */
			categories: RoleCategory[];
		}
		| (
			& {
				type: RoleCategoryTypes.Category;
			}
			& ({
				collection: RoleCollection<Omit<Assignable, 'onUnassignMessage'>>;

				isSingle: true;
			} | {
				collection: RoleCollection;

				limit?: number;

				isSingle: false;
			})
		)
	);

/**
 * Taking an array of categories, create a list of options for it.
 *
 * @param categories - The role categories.
 * @param language - The language of the guild.
 * @returns The created selections.
 */
function createSelectionsFromCategories(
	categories: RoleCategory[],
	language: Language | undefined,
): SelectOption[] {
	const categorySelections = getCategorySelections(categories, language);

	const selectOptions: SelectOption[] = [];
	for (let index = 0; index < categorySelections.length; index++) {
		const [category, shouldDisplay] = categorySelections[index]!;

		if (!shouldDisplay) continue;

		selectOptions.push({
			label: category.name,
			value: index.toString(),
			description: trim(category.description, 100),
			emoji: { name: category.emoji },
		});
	}

	return selectOptions;
}

function getCategorySelections(
	categories: RoleCategory[],
	language: Language | undefined,
): [RoleCategory, boolean][] {
	return categories.map<[RoleCategory, boolean]>(
		(category) => [
			category,
			(() => {
				if (category.type !== RoleCategoryTypes.Category) return false;

				if (
					category.collection.type === RoleCollectionTypes.Collection
				) {
					return true;
				}

				if (!language) return false;

				const localisedInto = <Language[]> Object.keys(
					category.collection.lists,
				);

				if (!localisedInto.includes(language)) return false;

				return true;
			})(),
		],
	);
}

export {
	createSelectionsFromCategories,
	getCategorySelections,
	RoleCategoryTypes,
};
export type { RoleCategory };
