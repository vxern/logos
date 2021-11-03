import { _ } from "../../../../deps.ts";
import { fromHex, RoleCategory, RoleList } from "../roles.ts";
import armenian from "./servers/armenian.ts";
import romanian from "./servers/romanian.ts";

const localCategories = ["ethnicities", "regions"] as const;
type LocalCategory = (typeof localCategories)[number];

const languages: Record<string, Record<LocalCategory, RoleList>> = {
  armenian,
  romanian,
};

const base: Record<LocalCategory, RoleCategoryWithoutRoleList> = {
  ethnicities: {
    limit: 1,
    description: "Roles identifying one's ethnicity.",
    color: fromHex("#68d8d6"),
    emoji: "🗾",
    roles: {
      onAssignMessage: (name) => `Your ethnicity is now ${name}.`,
      onUnassignMessage: (name) => `Your ethnicity is no longer ${name}.`,
      description: (name) => `I am of ${name} heritage.`,
    },
  },
  regions: {
    limit: 2,
    description: "Roles specifying which area of the country one is from.",
    color: fromHex("#c5e0d8"),
    emoji: "🤷‍♂️",
    roles: {
      onAssignMessage: (name) => `You are now from ${name}.`,
      onUnassignMessage: (name) => `You are no longer from ${name}`,
      description: (name) => `I am from ${name}.`,
    },
  },
};

const local: RoleCollection = _.merge(
  base,
  Object.fromEntries(
    localCategories.map((
      name,
    ) => [name, {
      roles: {
        lists: Object.fromEntries(
          Object.entries(languages).map((
            [language, collection],
          ) => [language, collection[name]]),
        ),
      },
    }]),
  ),
);

interface RoleCollection {
  [key: string]: LocalRoleCategory;
}

type LocalRoleCategory = Omit<RoleCategory, "roles"> & {
  "roles": Record<string, RoleList>;
};

type RoleCategoryWithoutRoleList = Omit<RoleCategory, "roles"> & {
  "roles": Omit<RoleList, "list">;
};

export type { LocalCategory };
export default local;
