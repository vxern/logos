import symbols from "./symbols";

export default {
	rgbHex: new RegExp(/#[0-9a-f]{6}/),
	discord: {
		snowflake: new RegExp(/^(\d{16,20})$/),
		userMention: new RegExp(/^<@!?(\d{16,20})>$/),
		userHandle: {
			new: new RegExp(/^(@?.{2,32})$/),
			old: new RegExp(/^([^@](?:.{1,31})?#(?:\d{4}|0))$/),
		},
	},
	// TODO(vxern): Remove this, I don't like it.
	userDisplay: new RegExp(/^.*?\(?(\d{16,20})\)?$/),
	youtubeUrl: new RegExp(
		/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
	),
	roleIndicators: new RegExp(
		`^(.+)${symbols.sigils.divider}([^${symbols.sigils.separator}]{2,4}(?:${symbols.sigils.separator}[^${symbols.sigils.separator}]{2,4})*)$`,
	),
	wholeWord: (word: string) => new RegExp(`(?<=^|\\p{Z}|\\p{P})${word}(?=\\p{Z}|\\p{P}|$)`, "giu"),
};
