import { fromNames } from "../../../module.ts";
import { RoleCategory } from "../../structures/role-category.ts";
import { RoleCollectionType } from "../../structures/role-collection.ts";

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
        "Aragats'otn / Արագածոտն",
        "Ararat / Արարատ",
        "Armavir / Արմավիր",
        "Geghark'unik' / Գեղարքունիք",
        "Kotayk' / Կոտայք",
        "Lorri / Լոռի",
        "Shirak / Շիրակ",
        "Syunik' / Սյունիք",
        "Tavush / Տավուշ",
        "Vayots' Dzor / Վայոց Ձոր",
        "Yerevan / Երևան",
      ]),
    },
  },
];

export default categories;
