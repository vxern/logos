FROM oven/bun:1.1.38

WORKDIR /usr/src/app

COPY assets ./assets
COPY migrations ./migrations
COPY scripts ./scripts
COPY source ./source
COPY package.json .
COPY bun.lockb .
COPY bunfig.toml .
COPY tsconfig.json .

RUN bun install \
&& chown -R bun:bun .

USER bun

ENTRYPOINT ["bun", "start"]