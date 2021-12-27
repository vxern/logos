import {
  ButtonStyle,
  Collector,
  Interaction,
  InteractionMessageComponentData,
  InteractionResponseType,
  MessageComponentType,
} from "../../../../deps.ts";
import { Client } from "../../../client.ts";
import { capitalise } from "../../../formatting.ts";
import { getProficiencyCategory } from "../../../modules/roles/module.ts";
import { tryAssignRole } from "../../../modules/roles/data/structures/role.ts";
import { ServiceStarter } from "../../services.ts";

const steps = ["ACCEPTED_RULES", "LANGUAGE_PROFICIENCY"];

const service: ServiceStarter = (client) => {
  const collector = new Collector({
    event: "interactionCreate",
    client: client,
    filter: (selection: Interaction) => {
      if (!selection.isMessageComponent()) {
        return false;
      }
      const customID = selection.data.custom_id;
      if (!steps.some((step) => customID.startsWith(step))) {
        return false;
      }
      return true;
    },
    deinitOnEnd: true,
  });

  const proficiencyCategory = getProficiencyCategory();
  const proficiencies = proficiencyCategory.collection!.list!;

  const proficiencyButtons = proficiencies.map((proficiency, index) => {
    return {
      type: MessageComponentType.BUTTON,
      style: ButtonStyle.GREY,
      label: proficiency.name,
      emoji: { name: proficiency.emoji },
      customID: `LANGUAGE_PROFICIENCY|${index}`,
    };
  });

  collector.on("collect", (interaction: Interaction) => {
    const data = interaction.data! as InteractionMessageComponentData;
    const [step, index] = data.custom_id.split("|");

    const language = Client.getLanguage(interaction.guild!)!;

    switch (step) {
      case "ACCEPTED_RULES": {
        interaction.respond({
          embeds: [{
            title: "Language Proficiency",
            description: `Select the role which best describes your ${
              capitalise(language)
            } language proficiency.`,
          }],
          components: [{
            type: MessageComponentType.ACTION_ROW,
            components: proficiencyButtons,
          }],
          ephemeral: true,
        });
        break;
      }
      case "LANGUAGE_PROFICIENCY": {
        const proficiency = proficiencies[parseInt(index)];
        tryAssignRole(interaction, language, proficiencyCategory, proficiency);
        interaction.respond({
          type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
        });
        break;
      }
    }

    return;
  });

  collector.collect();
};

export default service;
