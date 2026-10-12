# UNFRAME project instructions

Work on the integrated site in `site/`; retain source references in `references/` and operational guidance in `docs/`.

User-designated GitHub origin: https://github.com/KunsGallery/UNFRAME-Main.git. Use this repository for subsequent pushes. Default branch: main. Never force-push or overwrite remote work.

Before pushing website changes, run JavaScript syntax checks, appropriate tests and the site build. Do not commit service-account keys, private credentials, local .env files, node_modules or generated dist files. Preserve the distinction between demo mode and actual Firebase-connected operation.

## Firebase
Always look for and use the appropriate Firebase agent skills before Firebase tasks. Use the existing project `unframe-main` and web app ID `1:1003147136936:web:ae4a2bd6ec1ca8ade7179d`. Do not create a replacement project or app. CLI/MCP project context lives in `site/`.
