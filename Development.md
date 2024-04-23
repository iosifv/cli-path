## Links

- https://manage.auth0.com/dashboard/eu/iosifv/applications
- https://app.serverless.com/iosifv/metrics?globalAppName=clip-sls-api
-

## How to run cli-app

`yarn start`

## How to run the sls-api

1. Get a new authentication token if required
2. Make sure that the mock.json files contain the proper authentication
3. Run all the commands in order to make sure you're not missing anything:
   1. `yarn invoke-local-01-healthcheck`
   2. `yarn invoke-local-02-authentication`
   3. `invoke-local-03-location` - this should show the full location of Amsterdam's Dam Square
   4. `invoke-local-04-direction`

## Info about google account

## Todo list

- [ ] maybe add yarn to the root?
- [ ] configure vs-code tasks
- [ ] create open-api spec
- [ ] check possibility of using charmbracelet/vhs for demo-ing this
- [ ] setup github workflows
  - [ ] create a docker or something to install the cli app and test it
  - [ ] check /healthcheck on the sls app
  - [ ] create a tag on pushing to a certain branch?
  - [ ] on-tag-create publish a new version
