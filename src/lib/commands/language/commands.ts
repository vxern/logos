import answer from "./commands/answer";
import cefr from "./commands/cefr";
import correction from "./commands/correction";
import game from "./commands/game";
import recognise from "./commands/recognise";
import resources from "./commands/resources";
import translate from "./commands/translate";
import word from "./commands/word";

const { partial: correctionPartial, full: correctionFull } = correction;
const { chatInput: recogniseChatInput, message: recogniseMessage } = recognise;
const { chatInput: translateChatInput, message: translateMessage } = translate;

export {
	answer,
	cefr,
	correctionPartial,
	correctionFull,
	recogniseChatInput,
	recogniseMessage,
	game,
	resources,
	translateChatInput,
	translateMessage,
	word,
};
