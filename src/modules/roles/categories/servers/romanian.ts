import { fromNames } from "../../module.ts";
import { RoleCategory } from "../../structures/category.ts";
import { RoleCollectionType } from "../../structures/collection.ts";

const categories: Partial<RoleCategory>[] = [
  {
    name: "Ethnicities",
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      list: fromNames(["Aromanian", "Istro-Romanian", "Megleno-Romanian"]),
    },
  },
  {
    name: "Regions",
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      list: fromNames([
        "Banat",
        "Basarabia",
        "Bucovina",
        "Crișana",
        "Dobrogea",
        "Maramureș",
        "Moldova",
        "Muntenia",
        "Oltenia",
        "Transilvania",
      ]),
    },
  },
];

export default categories;
