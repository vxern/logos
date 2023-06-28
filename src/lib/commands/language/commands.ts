import game from "./commands/game.js";
import resources from "./commands/resources.js";
import translate from "./commands/translate.js";
import word from "./commands/word.js";

export default { local: [game, resources, translate, word], global: [translate] };
