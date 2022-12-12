import Configstore from 'configstore'
import fs from 'fs'
import path from 'path'
import _ from 'underscore'

const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'))

export const KEY_NAME_VERSION = 'version' // Reserved key, don't change
export const KEY_NAME_ENGINE = 'setting_engine'
export const KEY_NAME_ENVIRONMENT = 'application_environment'
export const KEY_NAME_AUTH0_DEVICE_CODE = 'setting_auth0_device_code'
export const KEY_NAME_AUTH0_ACCESS_TOKEN = 'setting_auth0_access_token'
export const KEY_NAME_GOOGLE_TOKEN = 'setting_google_api_token'
export const KEY_NAME_LOCATIONS = 'locations'

const REQUIRED_KEYS = [
  {
    name: KEY_NAME_VERSION,
    default: '0.0.1',
  },
  {
    name: KEY_NAME_ENGINE,
    default: 'clip',
  },
  {
    name: KEY_NAME_ENVIRONMENT,
    default: 'slsdev',
  },
  {
    name: KEY_NAME_AUTH0_DEVICE_CODE,
    default: null,
  },
  {
    name: KEY_NAME_AUTH0_ACCESS_TOKEN,
    default: null,
  },
  {
    name: KEY_NAME_GOOGLE_TOKEN,
    default: null,
  },
  {
    name: KEY_NAME_LOCATIONS,
    default: [],
  },
]

export const ERROR_MESSAGE_NO_KEY = 'No API Token Found'

let location

export class KeyManager {
  constructor() {
    this.config = new Configstore(packageJson.name, {
      version: packageJson.version,
    })
    this.set(KEY_NAME_VERSION, packageJson.version)

    this.validateConfig()
  }

  validateConfig() {
    REQUIRED_KEYS.forEach((key) => {
      const keyValue = this.config.get(key.name)
      if (!keyValue) {
        this.config.set(key.name, key.default)
      }
    })
    location = this.config.get(KEY_NAME_LOCATIONS)
  }

  addLocation(locationName, locationAddress) {
    const locationObject = {
      name: locationName,
      address: locationAddress,
    }
    // console.log('Pushing new location: ' + locationObject)
    location.push(locationObject)
    this.config.set(KEY_NAME_LOCATIONS, location)
  }

  deleteLocation(locationName) {
    location = _.reject(location, function (loc) {
      return loc.name == locationName
    })
    this.config.set(KEY_NAME_LOCATIONS, location)
  }

  getLocations() {
    return location
  }

  set(keyName, keyValue) {
    this.config.set(keyName, keyValue)
    return keyValue
  }

  exists(keyName) {
    const value = this.config.get(keyName)

    // Yes... Javascript is lovely.
    if (Array.isArray(value)) {
      return true
    }
    if (value == null || value == undefined || value == '') {
      return false
    }
    return true
  }

  get(keyName) {
    const value = this.config.get(keyName)

    if (!value) {
      throw new Error('No value found at key [' + keyName + ']')
    }

    return value
  }

  getOrNull(keyName) {
    const value = this.config.get(keyName)

    if (!value) {
      return null
    }

    return value
  }

  delete(keyName) {
    const value = this.config.get(keyName)

    if (!value) {
      throw new Error('No value fount at key [' + keyName + ']')
    }

    this.config.delete(keyName)

    return
  }

  /**
   * Not used yet
   */
  purgeAll() {
    config.clear()
    return
  }
}
