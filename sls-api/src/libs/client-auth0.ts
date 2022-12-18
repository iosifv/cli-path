import axios from 'axios'

import { formatJSONResponse, formatJSONError } from '@libs/api-gateway'
import { AUTH0_URL_USERINFO } from '@utils/constants'

export class Auth0Client {
  constructor() {}

  async getuserinfo(authorization: string) {
    const options = {
      method: 'POST',
      url: AUTH0_URL_USERINFO,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
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

  async userinfo(authorization: string) {
    const options = {
      method: 'POST',
      url: AUTH0_URL_USERINFO,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      data: {},
    }

    return await axios
      .request(options)
      .then(function (response) {
        return {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        }
      })
      .catch(function (error) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          data: {
            message: error.message,
          },
        }
      })
  }
}
