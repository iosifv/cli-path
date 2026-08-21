export default {
  type: 'object',
  properties: {
    query: { type: 'string', minLength: 1, maxLength: 200 },
  },
  required: ['query'],
  additionalProperties: false,
} as const
