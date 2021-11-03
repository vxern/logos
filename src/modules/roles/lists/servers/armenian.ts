import { RoleList } from "../../roles.ts";
import { LocalCategory } from "../local.ts";

const romanian: Record<LocalCategory, RoleList> = {
  ethnicities: {
    list: [
      "Armeno-Tat",
      "Circassian",
      "Hemshen",
      "Hidden",
    ],
  },
  regions: {
    list: [
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
    ],
  },
};

export default romanian;
