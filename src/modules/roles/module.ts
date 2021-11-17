import { Command } from "../../commands/command.ts";
import select from "./commands/profile/profile.ts";
import global from "./data/categories/global.ts";
import local from "./data/categories/local.ts";
import { RoleCategory } from "./data/structures/role-category.ts";
import { RoleCollectionType } from "./data/structures/role-collection.ts";
import { Role } from "./data/structures/role.ts";

const commands: Record<string, Command> = {
  select,
};

const roles = {
  moderator: "Guide",
  scopes: {
    global: supplyMissingProperties(global),
    local: supplyMissingProperties(local),
  },
};

function fromNames(names: string[]): Role[] {
  return names.map((name) => {
    return { name: name };
  });
}

function supplyMissingProperties(categories: RoleCategory[]): RoleCategory[] {
  for (const category of categories) {
    if (category.categories) {
      supplyMissingProperties(category.categories);
      continue;
    }

    const collection = category.collection!;

    for (
      const list of collection.type === RoleCollectionType.COLLECTION_LOCALISED
        ? Object.values(collection.lists!)
        : [collection.list!]
    ) {
      for (const role of list) {
        role.description ??= collection.description!(role.name);
        role.onAssignMessage ??= collection.onAssignMessage;
        role.onUnassignMessage ??= collection.onUnassignMessage;
      }
    }
  }

  return categories;
}

export { fromNames, roles };
export default commands;
