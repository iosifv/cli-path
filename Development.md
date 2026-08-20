## Links

- https://manage.auth0.com/dashboard/eu/iosifv/applications
-

## How to run cli-app

`yarn start`

## How to run the api

The API tier is being rebuilt on Vercel in `vercel-api/`. See that folder's README.

The previous Serverless/AWS implementation is frozen in `archived-sls-api/` and is no longer
deployed — see `archived-sls-api/ARCHIVED.md` for what it was and how it ran.

## Info about google account

## Todo list

- [ ] maybe add yarn to the root?
- [ ] configure vs-code tasks
- [x] create open-api spec
- [x] check possibility of using charmbracelet/vhs for demo-ing this
- [ ] setup github workflows
  - [ ] create a docker or something to install the cli app and test it
  - [ ] check /healthcheck on the api
  - [ ] create a tag on pushing to a certain branch?
  - [ ] on-tag-create publish a new version
