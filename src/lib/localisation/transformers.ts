import { MessagePipeTransformer } from 'messagepipe';
import english from 'logos/src/lib/localisation/transformers/english.ts';
import french from 'logos/src/lib/localisation/transformers/french.ts';
import hungarian from 'logos/src/lib/localisation/transformers/hungarian.ts';
import polish from 'logos/src/lib/localisation/transformers/polish.ts';
import romanian from 'logos/src/lib/localisation/transformers/romanian.ts';
import { Language } from 'logos/src/types.ts';

const transformers: Record<Language, Record<string, MessagePipeTransformer<string, string>>> = {
	'Armenian': {},
	'English': english,
	'French': french,
	'Hungarian': hungarian,
	'Polish': polish,
	'Romanian': romanian,
};

export default transformers;
