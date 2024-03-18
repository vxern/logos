import special from "./special";

export default Object.freeze({
	rgbHex: /^#[0-9a-f]{6}$/,
	discord: {
		snowflake: /^(\d{16,20})$/,
		userMention: /^<@!?(\d{16,20})>$/,
		userHandle: {
			new: /^(@?.{2,32})$/,
			old: /^([^@](?:.{1,31})?#(?:\d{4}|0))$/,
		},
	},
	// TODO(vxern): Remove this, I don't like it.
	userDisplay: /^.*?\(?(\d{16,20})\)?$/,
	youtubeUrl:
		/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
	roleIndicators: new RegExp(
		`^(.+)${special.sigils.divider}([^${special.sigils.separator}]{2,4}(?:${special.sigils.separator}[^${special.sigils.separator}]{2,4})*)$`,
	),
	conciseTimeExpression: /^(?:(?:(0?[0-9]|1[0-9]|2[0-4]):)?(?:(0?[0-9]|[1-5][0-9]|60):))?(0?[0-9]|[1-5][0-9]|60)$/,
	wholeWord: (word: string) => new RegExp(`(?<=^|\\p{Z}|\\p{P})${word}(?=\\p{Z}|\\p{P}|$)`, "giu"),
	emojiExpression: /\p{Extended_Pictographic}/u,
} as const);
