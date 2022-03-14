import 'https://deno.land/x/dotenv@v3.1.0/load.ts';
import { colors } from './deps.ts';
import { Client } from './src/client.ts';

const required = [
	'TEMPLATE_GUILD_ID',
	'DISCORD_SECRET',
	'YOUTUBE_SECRET',
	'SPOTIFY_ID',
	'SPOTIFY_SECRET',
	'LAVALINK_HOST',
	'LAVALINK_PORT',
	'LAVALINK_PASSWORD',
	'DEEPL_SECRET',
  'LANGUAGE_DETECTION_SECRET',
];
const supplied = Object.fromEntries(
	required.map((env) => [env, Deno.env.get(env)]),
);

if (Object.values(supplied).includes(undefined)) {
	const missing = Object.fromEntries(
		Object.entries(supplied).filter(([_, value]) => value === undefined),
	);
	console.error(
		colors.red(
			`Missing one or more environment variables:\n    ${
				Object.keys(missing).join(', ')
			}`,
		),
	);
	Deno.exit(1);
}

const client = new Client();
client.connect();
