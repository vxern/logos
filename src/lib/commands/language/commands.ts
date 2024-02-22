import answer from "./commands/answer";
import cefr from "./commands/cefr";
import correction from "./commands/correction";
import game from "./commands/game";
import recognise from "./commands/recognise";
import resources from "./commands/resources";
import translate from "./commands/translate";
// TODO(vxern): Re-export
// import word from "./commands/word";

const { partial: correctionPartialMessage, full: correctionFullMessage } = correction;
const { chatInput: recogniseChatInput, message: recogniseMessage } = recognise;
const { chatInput: translateChatInput, message: translateMessage } = translate;

export {
	answer as answerMessage,
	cefr,
	correctionPartialMessage,
	correctionFullMessage,
	recogniseChatInput as recognise,
	recogniseMessage,
	game,
	resources,
	translateChatInput as translate,
	translateMessage,
	//word,
};
