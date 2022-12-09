import Configstore from 'configstore'
import fs from 'fs'
import path from 'path';

const packageJson = JSON.parse(fs.readFileSync(path.resolve('./package.json'), 'utf8'));

const KEY_NAME_VERSION           = 'version' // Reserved key, don't change
const KEY_NAME_TOKEN_GOOGLE      = 'googleApiToken'
const KEY_NAME_LOCATIONS         = 'locations';
const KEY_NAME_AUTH0_DEVICE_CODE = 'auth0DeviceCode'
const KEY_NAME_AUTH0_TOKEN       = 'auth0Token'

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


  setToken(key) { return this.set(KEY_NAME_TOKEN_GOOGLE, key)}
  getToken()    { return this.get(KEY_NAME_TOKEN_GOOGLE) }
  deleteToken() { this.delete(KEY_NAME_TOKEN_GOOGLE) }

  setAuthDeviceCode(code) { return this.set(KEY_NAME_AUTH0_DEVICE_CODE, code) }
  getAuthDeviceCode()     { return this.get(KEY_NAME_AUTH0_DEVICE_CODE) }
  setAuthToken(value)     { return this.set(KEY_NAME_AUTH0_TOKEN, value) }
  getAuthToken()          { return this.get(KEY_NAME_AUTH0_TOKEN) }
  
  /**
   * Not used yet
   */
  purgeAll() {
    config.clear()
    return;
  }
}
