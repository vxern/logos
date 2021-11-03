import { RoleList } from "../../roles.ts";
import { LocalCategory } from "../local.ts";

const romanian: Record<LocalCategory, RoleList> = {
  ethnicities: {
    list: ["Aromanian", "Istro-Romanian", "Megleno-Romanian"],
  },
  regions: {
    list: [
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
    ],
  },
};

export default romanian;
