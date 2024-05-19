const fs = require('fs')
const path = require('path')
require('dotenv').config()

// List of paths to the mock.json files
const filePaths = [
  path.join(__dirname, 'src/functions/authentication/mock.json'),
  path.join(__dirname, 'src/functions/direction/mock.json'),
  path.join(__dirname, 'src/functions/healthcheck/mock.json'),
  path.join(__dirname, 'src/functions/location/mock.json'),
  path.join(__dirname, 'src/functions/statistics/mock.json'),
]

// Retrieve the new token from the CLI argument or .env file
const newToken = process.argv[2] || process.env.AUTH0_TOKEN

if (!newToken) {
  console.error('AUTH0_TOKEN is not defined in the .env file')
  process.exit(1)
}

const authorizationHeaderValue = 'Bearer ' + newToken

// Function to update a single mock.json file
const updateAuthorizationToken = (filePath) => {
  fs.readFile(filePath + '.bak', 'utf8', (err, data) => {
    if (err) {
      console.error(`Error reading file at ${filePath}:`, err)
      return
    }

    try {
      // Parse the JSON data
      const jsonData = JSON.parse(data)

      // Update the Authorization key with the new token
      jsonData.headers.Authorization = authorizationHeaderValue

      // Convert the JSON object back to a string
      const updatedJsonData = JSON.stringify(jsonData, null, 2)

      // Write the updated JSON back to the file
      fs.writeFile(filePath, updatedJsonData, 'utf8', (err) => {
        if (err) {
          console.error(`Error writing file at ${filePath}:`, err)
        } else {
          console.log(`Authorization token updated successfully in ${filePath}`)
        }
      })
    } catch (parseError) {
      console.error(`Error parsing JSON in file at ${filePath}:`, parseError)
    }
  })
}

// Iterate over each file path and update the authorization token
filePaths.forEach(updateAuthorizationToken)
