import { fromNames } from "../../module.ts";
import { RoleCategory } from "../../structures/category.ts";
import { RoleCollectionType } from "../../structures/collection.ts";

const categories: Partial<RoleCategory>[] = [
  {
    name: "Ethnicities",
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      list: [],
    },
  },
  {
    name: "Regions",
    collection: {
      type: RoleCollectionType.COLLECTION_LOCALISED,
      list: fromNames([
        "Brest",
        "Hrodna",
        "Homel",
        "Mahilyow",
        "Minsk",
        "Vitsebsk",
      ]),
    },
  },
];

export default categories;
