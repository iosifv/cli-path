export default {
  type: "object",
  properties: {
    ping: { type: 'boolean' }
  },
  required: ['ping']
} as const;
