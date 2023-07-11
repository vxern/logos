import * as information from "./information/commands.js";
import * as language from "./language/commands.js";
import * as moderation from "./moderation/commands.js";
import * as music from "./music/commands.js";
import * as server from "./server/commands.js";
import * as social from "./social/commands.js";

export default { ...information, ...language, ...moderation, ...music, ...server, ...social };
