import Configstore from 'configstore'
import fs from 'fs'
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const KEY_NAME_TOKEN_GOOGLE = 'googleApiToken'
export const ERROR_MESSAGE_NO_KEY = 'No API Token Found'

export class KeyManager {
  constructor() {
    this.config = new Configstore(
        packageJson.name, 
        {version: packageJson.version}
    );
    /**
     * Todo:
     * save constant for the name of the stored keys
     * use a function to create the key+version
     */

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


  
  purgeAll() {
    console.log(config.get());

    config.clear()

    return;
  }
}
