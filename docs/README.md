# 📟 cli-path

[![npm version](https://img.shields.io/npm/v/cli-path.svg)](https://www.npmjs.com/package/cli-path)
[![Build Status](https://github.com/iosifv/cli-path/actions/workflows/test.yaml/badge.svg?branch=main)](https://github.com/iosifv/cli-path/actions/workflows/test.yml)

A simple CLI tool to search paths on google maps. The intent is to use this on your most often taken paths to quickly get the grasp of the time needed for your travel - like going home from the office every day.

## Install

`npm install -g cli-path`

This will create the global executable `clip`

First time you use this you'll have to set a Google Maps API token. You'll need to enable `Directions API` and `Places API`. Unfortunately because of the way Google works you need to have billing enabled on your developer account so you have to add your credit card. For this project though it's next to impossible to excede the free tier of requests.
