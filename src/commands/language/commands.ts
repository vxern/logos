import game from 'logos/src/commands/language/commands/game.ts';
import resources from 'logos/src/commands/language/commands/resources.ts';
import translate from 'logos/src/commands/language/commands/translate.ts';
import word from 'logos/src/commands/language/commands/word.ts';

export default { local: [game, resources, translate, word], global: [translate] };
