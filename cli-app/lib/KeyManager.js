import Configstore from 'configstore'
import _ from 'underscore'
// export const KEY_NAME_VERSION = 'version' // Reserved key, don't change
export const KEY_NAME_ENGINE = 'setting_engine'
export const KEY_NAME_ENVIRONMENT = 'application_environment'
export const KEY_NAME_AUTH0_DEVICE_CODE = 'setting_auth0_device_code'
export const KEY_NAME_AUTH0_ACCESS_TOKEN = 'setting_auth0_access_token'
export const KEY_NAME_GOOGLE_TOKEN = 'setting_google_api_token'
export const KEY_NAME_LOCATIONS = 'locations'
export const KEY_NAME_USERINFO = 'auth0_userinfo'
export const STORE_NAME = 'cli-path'

export const REQUIRED_KEYS = [
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
  {
    // If this is set, Auth0 would have returned at least [sub, name, nickname]
    name: KEY_NAME_USERINFO,
    default: null,
  },
]

let location

export class KeyManager {
  constructor(storeName) {
    if (storeName == undefined) {
      storeName = STORE_NAME
    }
    this.config = new Configstore(storeName, {})

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

  getLocation(locationName) {
    return _.find(location, function (loc) {
      return loc.name == locationName
    })
  }

  getLocations() {
    return location
  }

  purgeLocations() {
    this.config.set(KEY_NAME_LOCATIONS, [])
  }

  getUser() {
    const user = this.get(KEY_NAME_USERINFO)
    return user.name
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
   * Only used in tests
   */
  purgeAll() {
    this.config.clear()
    return
  }
}
