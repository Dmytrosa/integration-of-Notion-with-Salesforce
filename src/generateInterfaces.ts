import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "./logger";
import { conn } from "./services/salesforceService";
dotenv.config();

async function generateInterface(objectName: string) {
  // Log in to Salesforce
  await conn.login(
    process.env.SALESFORCE_USERNAME || "",
    (process.env.SALESFORCE_PASSWORD || "") +
      (process.env.SALESFORCE_SECURITY_TOKEN || "")
  );

  // Describe the Salesforce object
  const meta = await conn.sobject(objectName).describe();
  const fields = meta.fields;

  let interfaceString = `export interface ${objectName} {\n  [key: string]: any; \n  LastSynced: Date; \n`;

  // Generate TypeScript interface for each field
  fields.forEach((field) => {
    const fieldType = mapSalesforceTypeToTypeScript(field);
    interfaceString += `  ${field.name}${
      field.nillable ? "?" : ""
    }: ${fieldType};\n`;
  });

  interfaceString += "}";

  // Ensure the models directory exists
  const modelsDir = path.join(__dirname, "models");
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir);
  }

  // Write the generated interface to a file
  fs.writeFileSync(path.join(modelsDir, `${objectName}.ts`), interfaceString);
  logger.info(`${objectName} interface generated successfully.`);
}

// Map Salesforce field types to TypeScript types
export function mapSalesforceTypeToTypeScript(field: any) {
  switch (field.type) {
    case "string":
    case "textarea":
    case "phone":
    case "picklist":
    case "id":
    case "url":
    case "email":
    case "reference":
      return "string";
    case "int":
    case "double":
    case "currency":
    case "percent":
      return "number";
    case "boolean":
      return "boolean";
    case "date":
    case "datetime":
      return "string";
    case "base64":
      return "string";
    default:
      return "any";
  }
}

// Get the object name from command-line arguments
const objectName = process.argv[2];

if (!objectName) {
  logger.error("Please provide a Salesforce object name as an argument.");
  process.exit(1);
}

// Generate the interface
generateInterface(objectName).catch((error) => {
  logger.error(`Error generating interface: ${error}`);
});
