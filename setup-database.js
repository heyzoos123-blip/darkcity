// Setup Railway PostgreSQL database for darkcity
const https = require('https');

const RAILWAY_TOKEN = process.env.RAILWAY_TOKEN || 'b3b5f8f6c7d14a2c9f4b1a2d3e4f5a6b'; // From gateway config
const PROJECT_ID = 'd0cd04c0-6d8d-49b8-b21d-5c56888a18e7';
const ENV_ID = 'fa88c3c8-732f-4d62-89e5-900825ce1eb8';

// GraphQL query to create PostgreSQL plugin
const createPostgresQuery = `
mutation pluginCreate($input: PluginCreateInput!) {
  pluginCreate(input: $input) {
    id
    name
  }
}
`;

const variables = {
  input: {
    projectId: PROJECT_ID,
    name: "darkcity-postgres",
    type: "postgresql"
  }
};

const data = JSON.stringify({
  query: createPostgresQuery,
  variables: variables
});

const options = {
  hostname: 'backboard.railway.app',
  port: 443,
  path: '/graphql/v2',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': `Bearer ${RAILWAY_TOKEN}`
  }
};

console.log('Creating PostgreSQL database on Railway...');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(responseData);
      if (result.errors) {
        console.error('❌ Error:', result.errors[0].message);
        // Try to get DATABASE_URL from existing postgres service
        console.log('\nTrying to get existing database URL...');
        return;
      }
      console.log('✅ PostgreSQL database created!');
      console.log('Plugin ID:', result.data.pluginCreate.id);
      console.log('\nRun: railway variables --service darkcity-postgres');
      console.log('To get the DATABASE_URL');
    } catch (err) {
      console.error('Failed to parse response:', responseData);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error);
});

req.write(data);
req.end();
