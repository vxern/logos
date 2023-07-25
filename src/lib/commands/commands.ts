import * as information from "./information/commands";
import * as language from "./language/commands";
import * as moderation from "./moderation/commands";
import * as music from "./music/commands";
import * as server from "./server/commands";
import * as social from "./social/commands";

export default { ...information, ...language, ...moderation, ...music, ...server, ...social };
