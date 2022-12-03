export default {
  type: "object",
  properties: {
    origin: { type: 'string' },
    destination: { type: 'string' }
  },
  required: ['origin', 'destination']
} as const;
