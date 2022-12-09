// Required fields
export const isRequired = (input) =>
  input === '' ? 'This value is required' : true

// This execution got  has no args
export const noArgs = () => (process.argv.length === 2 ? true : false)
