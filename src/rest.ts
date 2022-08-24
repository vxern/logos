import { baseEndpoints, colors, createRestManager } from "../deps.ts";
import secrets from "../secrets.ts";

const restUrl = `http://localhost:${secrets.core.discord.rest.port}`;

const rest = createRestManager({
  token: secrets.core.discord.secret,
  customUrl: restUrl,
  secretKey: secrets.core.discord.rest.secret,
});

const server = Deno.listen({ port: secrets.core.discord.rest.port });
console.info(`HTTP server is now running at ${colors.bold(restUrl)}.`);

for await (const connection of server) {
  handleRequest(connection);
}

async function handleRequest(connection: Deno.Conn): Promise<void> {
  const httpConnection = Deno.serveHttp(connection);
  for await (const requestEvent of httpConnection) {
    if (requestEvent.request.headers.get('AUTHORIZATION') !==  secrets.core.discord.rest.secret) {
      return requestEvent.respondWith(new Response(JSON.stringify({ error: 'Invalid authorization key.' }), {status: 401}));
    }

    const urlPart = requestEvent.request.url.substring(rest.customUrl.length);

    const result = await rest.runMethod(
      rest,
      requestEvent.request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      `${baseEndpoints.BASE_URL}${urlPart}`,
      await requestEvent.request.json()
    );

    if (result) {
      return requestEvent.respondWith(new Response(JSON.stringify(result), {status: 200}));
    }
    
    return requestEvent.respondWith(new Response(undefined, {status: 204}));
  }
}

export {rest};