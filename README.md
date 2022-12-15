# 📟 cli-path

[![npm version](https://img.shields.io/npm/v/cli-path.svg)](https://www.npmjs.com/package/cli-path)
[![cli-app-test-build](https://github.com/iosifv/cli-path/actions/workflows/cli-app-test-build.yaml/badge.svg)](https://github.com/iosifv/cli-path/actions/workflows/cli-app-test-build.yaml)

A simple CLI tool to search paths on google maps. The intent is to use this on your most often taken paths to quickly get the grasp of the time needed for your travel - like going home from the office every day.

## Website

Check the much nicer [Github Pages generated website](https://iosifv.github.io/cli-path/) for a nicer documentation

## Install

`npm install -g cli-path`

This will create the global executable `clip`

First time you use this you'll have to set a Google Maps API token. You'll need to enable `Directions API` and `Places API`. Unfortunately because of the way Google works you need to have billing enabled on your developer account so you have to add your credit card. For this project it's next to impossible to excede the free tier of requests.

## Usage

Start with the interractive session

```$ clip
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

## Notes

- change permissions of index.js to 777 so that you can run it directly with `./index.js`
