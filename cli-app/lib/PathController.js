import { KeyManager } from './KeyManager.js'

const keyManager = new KeyManager()

export class PathController {
  constructor() {
    const config = keyManager.get('config')
  }
}
