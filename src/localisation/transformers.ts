import { MessagePipeTransformer } from 'messagepipe';
import english from 'logos/src/localisation/transformers/english.ts';
import polish from 'logos/src/localisation/transformers/polish.ts';
import romanian from 'logos/src/localisation/transformers/romanian.ts';
import { Language } from 'logos/types.ts';

const transformers: Record<Language, Record<string, MessagePipeTransformer<any>>> = {
	'Armenian': {},
	'English': english,
	'Hungarian': {},
	'Polish': polish,
	'Romanian': romanian,
};

export default transformers;