# 📟 cli-path

[![npm version](https://img.shields.io/npm/v/cli-path.svg)](https://www.npmjs.com/package/cli-path)
[![CLI-App Test](https://github.com/iosifv/cli-path/actions/workflows/cli-app-test.yaml/badge.svg)](https://github.com/iosifv/cli-path/actions/workflows/cli-app-test.yaml)

A simple CLI tool to search paths on google maps. The intent is to use this on your most often taken paths to quickly get the grasp of the time needed for your travel - like going home from the office every day.

## Online links for this project

- [website](https://iosifv.github.io/cli-path/) - Github Pages
- [github](https://github.com/iosifv/cli-path) - Github repository
- [npm](https://www.npmjs.com/package/cli-path) - NPM Package for the cli app
- todo: serverless function

## Programming Concepts / Technologies used

The real reason I built this is for training purposes. Since every tutorial out there is trying to teach you how to increase one certain skill vertically, with this project I'm trying to expand vertically by touching as many technologies possible for this humble subject of making a Google Maps API call 🙂

### Architecture

The very zoomed out explanation is: a cli-app will call Google Maps API to view directions information within the terminal. In order to not have the user generate and add his own Google Maps tokens a new API is built which stands in between the cli-app and Google API. This way the user can choose to use our instantly available Clip API or Google Maps API with his own credentials.

### List of implemented things

- CLI App written in Javascript
  - [Commander](https://www.npmjs.com/package/commander) as a general framework to build the cli app and commands
  - [Configstore](https://www.npmjs.com/package/configstore) to save secret dotfile style settings
  - [Chalk](https://www.npmjs.com/package/chalk), [Ora](https://www.npmjs.com/package/ora), [Inquirer](https://www.npmjs.com/package/inquirer) and [cli-table3](https://www.npmjs.com/package/cli-table3) for a nicer interface
  - [Adapter Design Pattern](https://refactoring.guru/design-patterns/adapter) used for managing multiple search engines
- API implemented with [Serverless Framework](https://www.serverless.com/) written in Typescript
  - [Serverless Offline](https://www.serverless.com/plugins/serverless-offline) used for easy implementation
  - [Serverless Dotenv](https://www.serverless.com/plugins/serverless-dotenv-plugin) used to save secrets in a familiar way
- Authentification provided by [Auth0](https://auth0.com/)
  - Implemented [Device Authorization Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/call-your-api-using-the-device-authorization-flow) - so you don't need to authenticate from the CLI, just open a browser
  - Implemented [OAuth](https://auth0.com/docs/authenticate/protocols/oauth) with Github and Google as providers
- Insomnia Collections - synced repository, so you only need to point insomnia to this repo and you get all the endpoints
- [Github Actions](https://github.com/features/actions)
  - A static page is created and deployed for this page you're reading through [Github Pages](https://pages.github.com/) & Actions
- [OpenAPI](https://www.openapis.org/) specification

### List of wants

- [Serverless](https://www.serverless.com/plugins/serverless-prune-plugin)
- Terraform
- Create package through Github Actinos
- Create system for versioning
- Connect a dynamoDB to SLS
  - save number of calls for each user
- Limit calls globally and per user

### Links that helped me build this

- [Youtube - I created a Command Line Game for you // 5-Minute Node.js CLI Project](https://www.youtube.com/watch?v=_oHByo8tiEY)
- [Youtube - Easy Way to Create CLI Scripts with JavaScript and Node](https://www.youtube.com/watch?v=dfTpFFZwazI)
- [Youtube - Node.js CLI For Cryptocurrency Prices](https://www.youtube.com/watch?v=-6OAHsde15E)
- [Example CLI App - Coindex](https://github.com/bradtraversy/coindex-cli)
- [Auth0 - Device Authorization Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/call-your-api-using-the-device-authorization-flow#call-api)
- [Auth0 - Validate Access Tokens](https://auth0.com/docs/secure/tokens/access-tokens/validate-access-tokens)
