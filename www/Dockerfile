# besoinavocat.ca for Coolify (base directory /www): the exact copy of the WordPress site in legal colours.
# The build checks every page, word for word, against the mirror before anything is served.
FROM node:24-bookworm-slim AS build
WORKDIR /src
COPY build.mjs palette.mjs ./
COPY site ./site
COPY overrides ./overrides
COPY tools/check-site.mjs ./tools/
ARG BA_REQUEST_URL=https://portail.besoinavocat.ca/demande
RUN BA_REQUEST_URL="$BA_REQUEST_URL" node build.mjs && node tools/check-site.mjs

FROM nginx:1.28-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO /dev/null http://127.0.0.1/healthz || exit 1
