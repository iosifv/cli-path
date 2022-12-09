import type { AWS } from '@serverless/typescript'

import hello from '@functions/hello'
import ping from '@functions/ping'
import authentication from '@functions/authentication'
import direction from '@functions/direction'
import location from '@functions/location'

const serverlessConfiguration: AWS = {
  service: 'sls-api-ts',
  frameworkVersion: '3',
  plugins: [
    'serverless-offline',
    'serverless-esbuild',
    'serverless-dotenv-plugin',
  ],
  useDotenv: true,
  provider: {
    name: 'aws',
    runtime: 'nodejs14.x',
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps --stack-trace-limit=1000',
    },
  },
  // import the function via paths
  functions: {
    hello,
    ping,
    authentication,
    direction,
    location,
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ['aws-sdk'],
      target: 'node14',
      define: { 'require.resolve': undefined },
      platform: 'node',
      concurrency: 10,
    },

    dotenv: {
      required: ['GOOGLE_MAPS_API_KEY'],
    },
  },
}

module.exports = serverlessConfiguration
