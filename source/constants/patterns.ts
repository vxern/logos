import special from "logos:constants/special";

const patterns = Object.freeze({
	/** Used for matching hex colour representations, e.g. #ffffff */
	rgbHex: /^#[0-9a-f]{6}$/,
	discord: {
		/** Used for matching Discord IDs (snowflakes), e.g. 1071782537564803163 */
		snowflake: /^(\d{16,20})$/,
		/** Used for matching user mentions, e.g. <@902895279236333590> */
		userMention: /^<@!?(\d{16,20})>$/,
		userHandle: {
			/** Used for matching new user handles, e.g. @logos */
			new: /^(@?.{2,32})$/,
			/** Used for matching old user handles, e.g. Logos#6695 */
			old: /^([^@](?:.{1,31})?#(?:\d{4}|0))$/,
		},
	},
	userDisplay: /^.*?\(?(\d{16,20})\)?$/,
	/** Used for matching YouTube video/playlist links, e.g. https://www.youtube.com/watch?v=zNbCbYbaE3Y */
	youtubeUrl:
		/^(?:https?:)?(?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9\_-]{7,15})(?:[\?&][a-zA-Z0-9\_-]+=[a-zA-Z0-9\_-]+)*$/,
	/** Used for matching against role indicators in nicknames, e.g. Logos﹘EA・WA */
	roleIndicators: new RegExp(
		`^(.+)${special.sigils.divider}([^${special.sigils.separator}]{2,4}(?:${special.sigils.separator}[^${special.sigils.separator}]{2,4})*)$`,
	),
	/** Used for matching short time expressions, e.g. 22:51:09 */
	conciseTimeExpression: /^(?:(?:(0?[0-9]|1[0-9]|2[0-4]):)?(?:(0?[0-9]|[1-5][0-9]|60):))?(0?[0-9]|[1-5][0-9]|60)$/,
	/** Used for matching a full word and nothing else around. */
	wholeWord: (word: string) => new RegExp(`(?<=^|\\p{Z}|\\p{P})${word}(?=\\p{Z}|\\p{P}|$)`, "giu"),
	/** Used for matching emojis, e.g. ✨ */
	emojiExpression: /\p{Extended_Pictographic}/u,
} as const);

function isValidSnowflake(snowflake: string): boolean {
	return constants.patterns.discord.snowflake.test(snowflake);
}

function getSnowflakeFromIdentifier(identifier: string): string | undefined {
	return (
		constants.patterns.discord.snowflake.exec(identifier)?.at(1) ??
		constants.patterns.discord.userMention.exec(identifier)?.at(1) ??
		constants.patterns.userDisplay.exec(identifier)?.at(1)
	);
}

export default patterns;
export { isValidSnowflake, getSnowflakeFromIdentifier };