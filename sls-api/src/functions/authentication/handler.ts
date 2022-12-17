import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/api-gateway'
import { formatJSONResponse, formatJSONError } from '@libs/api-gateway'
import { AUTH0_URL_USERINFO } from '@libs/constants'
import { middyfy } from '@libs/lambda'
import axios from 'axios'

import schema from './schema'

const authentication: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const options = {
    method: 'POST',
    url: AUTH0_URL_USERINFO,
    headers: {
      'Content-Type': 'application/json',
      Authorization: event.headers.Authorization,
    },
    data: {},
  }

  return await axios
    .request(options)
    .then(function (response) {
      return formatJSONResponse({
        message: 'Success!',
        data: response.data,
      })
    })
    .catch(function (error) {
      console.log(error.response)

      return formatJSONError({
        status: error.response.statusText,
        data: {
          message: error.message,
          status: error.response.status,
        },
      })
    })
}

export const main = middyfy(authentication)
