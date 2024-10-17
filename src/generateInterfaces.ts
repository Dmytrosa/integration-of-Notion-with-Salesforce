import jsforce from 'jsforce';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

async function generateInterface(objectName: string) {
  const conn = new jsforce.Connection({
    oauth2: {
      loginUrl: 'https://login.salesforce.com',
      clientId: process.env.SALESFORCE_CLIENT_ID,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
    },
  });

  await conn.login(
    process.env.SALESFORCE_USERNAME || '',
    (process.env.SALESFORCE_PASSWORD || '') + (process.env.SALESFORCE_SECURITY_TOKEN || '')
  );

  const meta = await conn.sobject(objectName).describe();
  const fields = meta.fields;

  let interfaceString = `export interface ${objectName} {\n   [key: string]: any; \n`;

  fields.forEach((field) => {
    const fieldType = mapSalesforceTypeToTypeScript(field);
    interfaceString += `  ${field.name}${field.nillable ? '?' : ''}: ${fieldType};\n`;
  });

  interfaceString += '}';

  // Ensure the models directory exists
  const modelsDir = path.join(__dirname, 'models');
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
  }

  fs.writeFileSync(path.join(modelsDir, `${objectName}.ts`), interfaceString);
  console.log(`${objectName} interface generated successfully.`);
}

export function mapSalesforceTypeToTypeScript(field: any) {
  switch (field.type) {
    case 'string':
    case 'textarea':
    case 'phone':
    case 'picklist':
    case 'id':
    case 'url':
    case 'email':
    case 'reference':
      return 'string';
    case 'int':
    case 'double':
    case 'currency':
    case 'percent':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
      return 'string'; // Use 'string' or 'Date' based on your preference
    case 'base64':
      return 'string';
    default:
      return 'any';
  }
}

// Get the object name from command-line arguments
const objectName = process.argv[2];

if (!objectName) {
  console.error('Please provide a Salesforce object name as an argument.');
  process.exit(1);
}

generateInterface(objectName).catch((error) => {
  console.error(`Error generating interface: ${error}`);
});
