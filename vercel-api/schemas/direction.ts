import { ORS_PROFILES } from '../utils/constants.js'

/**
 * Schemas do double duty, as they did in the archived stack: `json-schema-to-ts`
 * derives the handler's request type from them, and ajv validates against the
 * same object at runtime. API Gateway used to provide that runtime check; on
 * Vercel there is no gateway in front, so lib/guard.ts runs ajv itself.
 *
 * Note: `required: []` broke API Gateway deploys in the archived stack
 * (docs/README.md). Not a constraint here, but omit the key rather than
 * writing an empty array.
 */
export default {
  type: 'object',
  properties: {
    origin: { type: 'string', minLength: 1, maxLength: 200 },
    destination: { type: 'string', minLength: 1, maxLength: 200 },
    profile: { type: 'string', enum: ORS_PROFILES },
  },
  required: ['origin', 'destination'],
  additionalProperties: false,
} as const
