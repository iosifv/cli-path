export default {
  type: 'object',
  properties: {
    query: { type: 'string' },
  },
  required: ['query'],
} as const
