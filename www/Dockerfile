# besoinavocat.ca for Coolify (base directory /www): the exact copy of the WordPress site.
# BA_STYLE=wordpress (default, D-031, exact copy D-032) keeps the WordPress colours, logo, cookie banner, buttons and head tags; BA_STYLE=legal applies D-026.
# The build checks every page, word for word, against the mirror before anything is served.
FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY build.mjs palette.mjs consent.mjs seo.mjs ./
COPY site ./site
COPY overrides ./overrides
COPY parity ./parity
COPY tools/check-site.mjs ./tools/
ARG BA_REQUEST_URL=https://portail.besoinavocat.ca/demande
ARG BA_STYLE=wordpress
RUN BA_REQUEST_URL="$BA_REQUEST_URL" BA_STYLE="$BA_STYLE" node build.mjs && BA_STYLE="$BA_STYLE" node tools/check-site.mjs

FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1/healthz || exit 1
