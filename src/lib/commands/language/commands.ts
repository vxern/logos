import answer from "./commands/answer";
import cefr from "./commands/cefr";
import correction from "./commands/correction";
import game from "./commands/game";
import resources from "./commands/resources";
import translate from "./commands/translate";
import word from "./commands/word";

const { partial: correctionPartial, full: correctionFull } = correction;

export { answer, cefr, correctionPartial, correctionFull, game, resources, translate, word };
