import answer from "./commands/answer";
import cefr from "./commands/cefr";
import correction from "./commands/correction";
import detect from "./commands/detect";
import game from "./commands/game";
import resources from "./commands/resources";
import translate from "./commands/translate";
import word from "./commands/word";

const { partial: correctionPartial, full: correctionFull } = correction;
const { chatInput: detectLanguageChatInput, message: detectLanguageMessage } = detect;
const { chatInput: translateChatInput, message: translateMessage } = translate;

export {
	answer,
	cefr,
	correctionPartial,
	correctionFull,
	detectLanguageChatInput,
	detectLanguageMessage,
	game,
	resources,
	translateChatInput,
	translateMessage,
	word,
};
