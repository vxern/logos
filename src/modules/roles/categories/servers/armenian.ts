import { fromNames } from "../../module.ts";
import { RoleCategory } from "../../structures/category.ts";
import { RoleCollectionType } from "../../structures/collection.ts";

const categories: Partial<RoleCategory>[] = [
  {
    name: "Ethnicities",
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      list: fromNames([
        "Armeno-Tat",
        "Circassian",
        "Hemshen",
        "Hidden",
      ]),
    },
  },
  {
    name: "Regions",
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      list: fromNames([
        "Aragats'otn",
        "Ararat",
        "Armavir",
        "Geghark'unik'",
        "Kotayk'",
        "Lorri",
        "Shirak",
        "Syunik'",
        "Tavush",
        "Vayots' Dzor",
        "Yerevan",
      ]),
    },
  },
];

export default categories;
