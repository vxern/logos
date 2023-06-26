import game from 'logos/src/lib/commands/language/commands/game.ts';
import resources from 'logos/src/lib/commands/language/commands/resources.ts';
import translate from 'logos/src/lib/commands/language/commands/translate.ts';
import word from 'logos/src/lib/commands/language/commands/word.ts';

export default { local: [game, resources, translate, word], global: [translate] };
