import { underlined } from "../../../client.ts";
import { fromHex, RoleCollection } from "../roles.ts";

const base: RoleCollection = {
  proficiency: {
    limit: 1,
    description: "Roles defining one's proficiency.",
    color: fromHex("#1c1c1c"),
    emoji: "🎓",
    isGradual: true,
    roles: {
      onAssignMessage: (name) =>
        `Your language proficiency is now ${name.toLowerCase()}.`,
      list: [{
        name: "Beginner",
        description:
          "I am just beginning to learn; I have limited understanding and I know a couple basic phrases.",
        emoji: "🟩",
      }, {
        name: "Intermediate",
        description:
          "I have been learning for a while; I have decent understanding and I can sustain a conversation.",
        emoji: "🟦",
      }, {
        name: "Advanced",
        description:
          "I have been learning for a long time; I have firm understanding and I can speak without much effort.",
        emoji: "🟥",
      }, {
        name: "Native",
        description:
          "I was brought up speaking the language; I understand and I can speak about everything with ease.",
        emoji: "🟨",
      }],
    },
  },
  personalisation: {
    limit: -1,
    description: "Roles used to personalise one's server profile.",
    color: fromHex("#ffe548"),
    emoji: "🌈",
    categories: {
      gender: {
        limit: 1,
        description: "Roles defining one's gender.",
        color: fromHex("#ff4b3e"),
        // TODO(vxern): Use '⚧️' instead when Discord supports it.
        emoji: "⚧",
        roles: {
          description: (name) =>
            `I am of the ${name.toLowerCase()} persuasion.`,
          onAssignMessage: (name) =>
            `You now identify as a ${name.toLowerCase()}.`,
          list: [{
            name: "Male",
            emoji: "♂️",
          }, {
            name: "Female",
            emoji: "♀️",
          }, {
            name: "Transgender",
            // TODO(vxern): Use '⚧️' instead when Discord supports it.
            emoji: "⚧",
          }, {
            name: "Non-binary",
            emoji: "❔",
          }],
        },
      },
      abroad: {
        limit: -1,
        description: "Roles related to the abroad.",
        color: fromHex("#d6e3f8"),
        emoji: "🌎",
        roles: {
          onAssignMessage: (name) => `You are now a ${name}.`,
          onUnassignMessage: (name) => `You are no longer a ${name}.`,
          list: [{
            name: "Diasporan",
            description:
              "I am a native, or a child of natives, who has been brought up abroad.",
            emoji: "🌎",
          }],
        },
      },
    },
  },
  learning: {
    limit: -1,
    description: "Roles applied in teaching and learning the language.",
    color: fromHex("#daddd8"),
    emoji: "📖",
    roles: {
      list: [{
        name: "Correct Me",
        onAssignMessage: (_) =>
          `Other users will now be able to see that you demand additional corrections.`,
        onUnassignMessage: (_) =>
          `Other users will no longer be able to see that you demand additional corrections.`,
        description: `"I think, therefore I make mistakes." Please ${
          underlined("do correct me")
        }`,
        emoji: "✍️",
      }],
    },
  },
  pingable: {
    limit: -1,
    description:
      "Roles that allow one to be notified at various occassions, such as VC sessions and lessons.",
    color: fromHex("#9d5c63"),
    emoji: "💡",
    roles: {
      list: [{
        name: "Classroom Attendee",
        onAssignMessage: (_) =>
          `You will now be notified of each lesson before it begins.`,
        onUnassignMessage: (_) =>
          `You will no longer be notified before each lesson.`,
        description:
          "I attend sessions in the classroom channel and would like to be notified when a session takes place.",
        emoji: "📖",
      }, {
        name: "Voicechatter",
        onAssignMessage: (_) => `You can now be notified of a VC session.`,
        onUnassignMessage: (_) =>
          "You will no longer be notified of VC sessions.",
        description:
          "I enjoy attending (un)announced VC sessions and speaking with other people.",
        emoji: "🗣️",
      }],
    },
  },
};

export default base;
