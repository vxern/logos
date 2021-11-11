import { _ } from "../../../../deps.ts";
import { fromHex } from "../../../utils.ts";
import { RoleCategory, RoleCategoryType } from "../structures/category.ts";
import { RoleCollectionType } from "../structures/collection.ts";
import armenian from "./servers/armenian.ts";
import romanian from "./servers/romanian.ts";

const languages: Record<string, Partial<RoleCategory>[]> = {
  armenian,
  romanian,
};

const base: RoleCategory[] = [
  {
    type: RoleCategoryType.CATEGORY,
    name: "Ethnicities",
    description: "Roles identifying one's ethnicity.",
    color: fromHex("#68d8d6"),
    emoji: "🗾",
    limit: 1,
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      onAssignMessage: (name) => `Your ethnicity is now ${name}.`,
      onUnassignMessage: (name) => `Your ethnicity is no longer ${name}.`,
      description: (name) => `I am of ${name} heritage.`,
    },
  },
  {
    type: RoleCategoryType.CATEGORY,
    name: "Regions",
    description: "Roles specifying which area of the country one is from.",
    color: fromHex("#c5e0d8"),
    emoji: "🤷‍♂️",
    limit: 2,
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      onAssignMessage: (name) => `You are now from ${name}.`,
      onUnassignMessage: (name) => `You are no longer from ${name}`,
      description: (name) => `I am from ${name}.`,
    },
  },
];

const local: RoleCategory[] = _.merge(
  base,
  base.map((_, index) => {
    return {
      collection: {
        lists: Object.fromEntries(
          Object.entries(languages).map(([language, categories]) => {
            return [language, categories[index].collection!.list!];
          }),
        ),
      },
    };
  }),
);

export default local;
