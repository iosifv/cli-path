import type { AWS } from '@serverless/typescript'
import healthcheck from '@functions/healthcheck'
import authentication from '@functions/authentication'
import direction from '@functions/direction'
import location from '@functions/location'
import statistics from '@functions/statistics'
// import { Table } from '@aws-cdk/aws-dynamodb'

const serverlessConfiguration: AWS = {
  service: 'clip-sls-api-2024',
  frameworkVersion: '3',
  plugins: ['serverless-offline', 'serverless-esbuild', 'serverless-dotenv-plugin'],
  useDotenv: true,
  provider: {
    name: 'aws',
    runtime: 'nodejs18.x',
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
    healthcheck,
    authentication,
    direction,
    location,
    statistics,
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
  resources: {
    Resources: {
      // Define your DynamoDB table here
      ClipUsageLog: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          TableName: 'ClipUsageLog',
          AttributeDefinitions: [
            {
              AttributeName: 'User',
              AttributeType: 'S', // Change if your key is not a string
            },
            // Add more AttributeDefinitions if needed
          ],
          KeySchema: [
            {
              AttributeName: 'User',
              KeyType: 'HASH',
            },
            // Add more KeySchema if needed
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 2, // Adjust according to your read capacity needs
            WriteCapacityUnits: 2, // Adjust according to your write capacity needs
          },
          // Add more properties as needed, such as BillingMode, etc.
        },
      },
    },
  },
}

module.exports = serverlessConfiguration
