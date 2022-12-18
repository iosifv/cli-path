import middy from '@middy/core'
import middyJsonBodyParser from '@middy/http-json-body-parser'
import myMiddleware from './my-middleware'

export const middyfy = (handler) => {
  return middy(handler).use(middyJsonBodyParser()).use(myMiddleware())
}
