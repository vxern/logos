/** Discord API library. */
export * from 'https://raw.githubusercontent.com/harmonyland/harmony/main/mod.ts';

/** Database connection. */
export * as faunadb from 'https://deno.land/x/fauna@5.0.0-deno-alpha9/mod.ts';

/** Music playback. */
export * as lavadeno from 'https://deno.land/x/lavadeno@3.2.2/mod.ts';

/** Extracting data from webpages. */
export * from 'https://deno.land/x/cheerio@1.0.4/mod.ts';

/** Colouring console output. */
export * as colors from 'https://deno.land/x/nanocolors@0.1.12/mod.ts';

/** Utility features. */
export * as _ from 'https://deno.land/x/lodash@4.17.15-es/lodash.js';

/** Date/time library for dealing with time. */
import dayjs from 'https://cdn.skypack.dev/dayjs';
import relativeTime from 'https://cdn.skypack.dev/dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export { dayjs };
