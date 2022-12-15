import { assert } from 'chai'
import { KeyManager, STORE_NAME, REQUIRED_KEYS, KEY_NAME_LOCATIONS } from '../lib/KeyManager.js'

describe('Check KeyManager functionality', function () {
  let keyManager

  afterEach(function () {
    keyManager.purgeAll()
  })

  describe('Initialisation', () => {
    beforeEach(async () => {
      keyManager = new KeyManager(STORE_NAME + '-test-init')
    })

    it('Initilizes the storage object correctly', async () => {
      REQUIRED_KEYS.forEach((key) => {
        if (key.default != null && key.name != KEY_NAME_LOCATIONS) {
          assert.equal(keyManager.get(key.name), key.default)
        }
      })
    })
  })

  describe('Location', function () {
    beforeEach(async () => {
      keyManager = new KeyManager(STORE_NAME + '-test-location')
      keyManager.addLocation('test-name-1', 'test-full-address')
      keyManager.addLocation('test-name-2', 'test-full-address-duplicate')
      keyManager.addLocation('test-name-3', 'test-full-address-duplicate')
    })

    it('Initilizes the location object correctly', async () => {
      const locations = keyManager.getLocations()
      assert.isArray(locations)
    })
    it('Adds new locations correctly', async () => {
      keyManager.addLocation('test-name-4', 'test-full-new-address')
      const locations = keyManager.getLocations()
      assert.equal(locations.length, 4)
    })
    it('Reads existing locations correctly', async () => {
      const location2 = keyManager.getLocation('test-name-2')
      assert.equal(location2.name, 'test-name-2')
      assert.equal(location2.address, 'test-full-address-duplicate')
    })
    it('Deletes existing locations correctly', async () => {
      keyManager.deleteLocation('test-name-2')
      const locations = keyManager.getLocations()
      assert.equal(locations.length, 2)
    })
  })

  describe('Setters and getters', function () {
    let random1, random2, random3, randomA, randomB, randomC
    beforeEach(async () => {
      // https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
      random1 = (Math.random() + 1).toString(36).substring(2)
      random2 = (Math.random() + 1).toString(36).substring(2)
      random3 = (Math.random() + 1).toString(36).substring(2)
      randomA = (Math.random() + 1).toString(36).substring(2)
      randomB = (Math.random() + 1).toString(36).substring(2)
      randomC = (Math.random() + 1).toString(36).substring(2)
      keyManager = new KeyManager(STORE_NAME + '-test-setters')
    })

    it('Setts random new key', async () => {
      assert.equal(keyManager.set(random1, randomA), randomA)
    })

    it('Gets random new Value', async () => {
      keyManager.set(random1, randomA)
      keyManager.set(random2, randomB)
      keyManager.set(random3, randomC)
      assert.equal(keyManager.get(random1), randomA)
      assert.equal(keyManager.get(random2), randomB)
      assert.equal(keyManager.get(random3), randomC)
    })

    it('Checks if value exists', async () => {
      keyManager.set(random1, randomA)
      assert.isTrue(keyManager.exists(random1))
    })

    it('Returns null for inexistent key', async () => {
      assert.isNull(keyManager.getOrNull('random-inexistent-key'))
    })

    it('Can delete key', async () => {
      keyManager.set(random1, randomA)
      keyManager.delete(random1)
      assert.isFalse(keyManager.exists(random1))
    })
  })

  describe('Purge', () => {
    beforeEach(async () => {
      keyManager = new KeyManager(STORE_NAME + '-test-purge')
    })

    it('Purges everything', async () => {
      keyManager.set('random1', 'randomA')
      keyManager.set('random2', 'randomB')
      keyManager.set('random3', 'randomC')
      assert.equal(keyManager.get('random1'), 'randomA')
      keyManager.purgeAll()
      assert.isFalse(keyManager.exists('random1'))
      assert.isFalse(keyManager.exists('random2'))
      assert.isFalse(keyManager.exists('random3'))
    })
  })
})
