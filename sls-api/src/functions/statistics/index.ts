import schema from './schema'
import { handlerPath } from '@utils/handler-resolver'

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'statistics',
        request: {
          schemas: {
            'application/json': schema,
          },
        },
      },
    },
  ],
}
