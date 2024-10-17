import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import { Contact } from "./models";
import { mapSalesforceFieldToNotionProperty } from "./fieldMapping";
import { Field } from "jsforce";
import logger from "./logger";

dotenv.config();

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export async function getDatabaseSchema(databaseId: string) {
  const response = await notion.databases.retrieve({ database_id: databaseId });
  return response.properties;
}

export function identifyMissingProperties(
  existingProperties: { [key: string]: any },
  requiredProperties: string[]
) {
  const missingProperties = requiredProperties.filter(
    (prop) => !existingProperties.hasOwnProperty(prop)
  );
  return missingProperties;
}

export async function addPropertiesToDatabase(
  databaseId: string,
  propertiesToAdd: { [key: string]: any }
) {
  await notion.databases.update({
    database_id: databaseId,
    properties: propertiesToAdd,
  });
}

export async function insertContactIntoNotion(
  contact: Contact,
  fields: Field[]
) {
  const databaseId = process.env.NOTION_CONTACTS_DATABASE_ID || "";

  // Step 1: Fetch current database schema
  const existingProperties = await getDatabaseSchema(databaseId);

  // Step 2: Prepare the properties we want to insert
  const properties: any = {};

  // Collect required property names
  const requiredPropertyNames: string[] = [];

  fields.forEach((field) => {
    const fieldName = field.name;
    const fieldLabel = field.label;
    const value = contact[fieldName];
    if (value !== undefined && value !== null) {
      requiredPropertyNames.push(fieldLabel);
      const notionProperty = mapSalesforceFieldToNotionProperty(field, value);
      if (notionProperty !== null) {
        properties[fieldLabel] = notionProperty;
      }
    }
  });

  // Step 3: Identify missing properties
  const missingPropertiesNames = identifyMissingProperties(
    existingProperties,
    requiredPropertyNames
  );

  // Step 4: Define the properties to add
  const propertiesToAdd: { [key: string]: any } = {};

  // missingPropertiesNames.forEach((propName) => {
  //   // For simplicity, we'll default to 'rich_text' type for missing properties.
  //   // You can enhance this to set appropriate types based on field metadata.
  //   propertiesToAdd[propName] = { rich_text: {} };
  // });
  function mapSalesforceFieldTypeToNotionPropertyType(field: Field): any {
    switch (field.type) {
      case "email":
        return { email: {} };
      case "phone":
        return { phone_number: {} };
      case "date":
      case "datetime":
        return { date: {} };
      case "boolean":
        return { checkbox: {} };
      case "int":
      case "double":
      case "currency":
      case "percent":
        return { number: {} };
      default:
        return { rich_text: {} };
    }
  }
  

  missingPropertiesNames.forEach((propName) => {
    const field = fields.find((f) => f.label === propName);
    const notionPropertyType =
      field && mapSalesforceFieldTypeToNotionPropertyType(field);
    propertiesToAdd[propName] = notionPropertyType;
  });

  // Step 5: Update the database schema if there are missing properties
  //   if (Object.keys(propertiesToAdd).length > 0) {
  //     await addPropertiesToDatabase(databaseId, propertiesToAdd);
  //     // Fetch the updated properties
  //     Object.assign(existingProperties, await getDatabaseSchema(databaseId));
  //   }


  if (Object.keys(propertiesToAdd).length > 0) {
    logger.info(
      `Adding ${
        Object.keys(propertiesToAdd).length
      } new properties to the database schema.`
    );
    await addPropertiesToDatabase(databaseId, propertiesToAdd);
    logger.info("Database schema updated successfully.");
  }

  // Step 6: Ensure the 'Name' property is set, as Notion requires a title property
  if (!properties["Name"]) {
    properties["Name"] = {
      title: [
        {
          text: {
            content: contact.Name || "Untitled",
          },
        },
      ],
    };
  } else if (!properties["Name"].title) {
    // Adjust 'Name' property to be the title
    properties["Name"] = {
      title: properties["Name"].rich_text,
    };
  }

  // Step 7: Create the page in Notion
  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: properties,
  });
}
