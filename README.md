# 📟 cli-path 
[![npm version](https://img.shields.io/npm/v/cli-path.svg)](https://www.npmjs.com/package/cli-path)
[![Build Status](https://github.com/iosifv/cli-path/actions/workflows/test.yaml/badge.svg?branch=main)](https://github.com/iosifv/cli-path/actions/workflows/test.yml)

A simple CLI tool to search paths on google maps. The intent is to use this on your most often taken paths to quickly get the grasp of the time needed for your travel - like going home from the office every day.

## Install
```npm install -g cli-path```

This will create the global executable `clip`

First time you use this you'll have to set a Google Maps API token. You'll need to enable `Directions API` and `Places API`. Unfortunately because of the way Google works you need to have billing enabled on your developer account so you have to add your credit card. For this project though it's next to impossible to excede the free tier of requests.

## Usage

Start with the interractive session
``` $ clip
? What would you like to do
 (Use arrow keys)
❯ Quick Path Search 
  New Path Search 
  Show Locations 
  Add Location 
  Set Google API Token
```

Standard steps could be
1. Add your api token
2. Try "New Path Search"
3. Add a few Locations like home, office, park, pub
4. Then use Quick Path Search

## Online links for this project
- [github](https://github.com/iosifv/cli-path)
- [npm](https://www.npmjs.com/package/cli-path)

## Dependencies
- [google-maps-services](https://github.com/googlemaps/google-maps-services-js)
- [commander](https://www.npmjs.com/package/commander)
- [configstore](https://www.npmjs.com/package/configstore)
- [inquirer](https://www.npmjs.com/package/inquirer)
- [chalk](https://www.npmjs.com/package/chalk)
- [underscore](https://underscorejs.org/)

## Notes
- change permissions of index.js to 777 so that you can run it directly with ```./index.js```

## Links that helped me build this
- [Youtube - I created a Command Line Game for you // 5-Minute Node.js CLI Project](https://www.youtube.com/watch?v=_oHByo8tiEY)
- [Youtube - Easy Way to Create CLI Scripts with JavaScript and Node](https://www.youtube.com/watch?v=dfTpFFZwazI)
- [Youtube - Node.js CLI For Cryptocurrency Prices](https://www.youtube.com/watch?v=-6OAHsde15E)
- https://github.com/bradtraversy/coindex-cli
- https://auth0.com/docs/get-started/authentication-and-authorization-flow/call-your-api-using-the-device-authorization-flow#call-api