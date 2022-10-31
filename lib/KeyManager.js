import Configstore from 'configstore'
import fs from 'fs'
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const KEY_NAME_VERSION      = 'version' // Reserved key, don't change
const KEY_NAME_TOKEN_GOOGLE = 'googleApiToken'
const KEY_NAME_LOCATIONS    = 'locations';

export const ERROR_MESSAGE_NO_KEY = 'No API Token Found'

let location;

export class KeyManager {
  constructor() {
    this.config = new Configstore(
        packageJson.name, 
        {version: packageJson.version}
    );
    
    this.set(KEY_NAME_VERSION, packageJson.version)
    this.initLocation()
  }

  initLocation() {
    location = this.config.get(KEY_NAME_LOCATIONS);
    if (!location) {
      this.config.set(KEY_NAME_LOCATIONS, []);
      location = this.config.get(KEY_NAME_LOCATIONS);
    }
  }

  addLocation(locationName, locationAddress) {
    const locationObject = {
      name: locationName,
      address: locationAddress
    }
    console.log('Pushing new location: ' + locationObject)
    location.push(locationObject)
    this.config.set(KEY_NAME_LOCATIONS, location)
  }

  getLocations() {
    return location
  }

  set(keyName, keyValue) {
    this.config.set(keyName, keyValue);
    return keyValue;
  }

  get(keyName) {
    const value = this.config.get(keyName);

    if (!value) {
      throw new Error('No value fount at key [' + keyName + ']');
    }

    return value;
  }

  delete(keyName) {
    const value = this.config.get(keyName);

    if (!value) {
      throw new Error('No value fount at key [' + keyName + ']');
    }

    this.config.delete(keyName);

    return;
  }



  setToken(key) {
    this.config.set(KEY_NAME_TOKEN_GOOGLE, key);
    return key;
  }

  getToken() {
    const key = this.config.get(KEY_NAME_TOKEN_GOOGLE);

    if (!key) {
      throw new Error(ERROR_MESSAGE_NO_KEY);
    }

    return key;
  }

  deleteToken() {
    const key = this.config.get(KEY_NAME_TOKEN_GOOGLE);

    if (!key) {
      throw new Error(ERROR_MESSAGE_NO_KEY);
    }

    this.config.delete(KEY_NAME_TOKEN_GOOGLE);

    return;
  }

  /**
   * Not used yet
   */
  purgeAll() {
    config.clear()
    return;
  }
}
