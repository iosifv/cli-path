import Configstore from 'configstore'
import fs from 'fs'
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

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

  setKey(key) {
    this.config.set('apiKey', key);
    return key;
  }

  getKey() {
    const key = this.config.get('apiKey');

    if (!key) {
      throw new Error('No API Key Found');
    }

    return key;
  }

  deleteKey() {
    const key = this.config.get('apiKey');

    if (!key) {
      throw new Error('No API Key Found');
    }

    this.config.delete('apiKey');

    return;
  }

  purgeAll() {
    console.log(config.get());

    config.clear()

    return;
  }
}
