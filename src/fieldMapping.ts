import { Field } from "jsforce";
import { NAME } from "./constants/general";

export function mapSalesforceFieldToNotionProperty(
  field: Field,
  value: any
): any {
  const fieldType = field.type;
  const notionProperty: any = {};

  // Return null for null or undefined values
  if (value === null || value === undefined) {
    return null;
  }

  // Handle object fields (e.g., complex addresses)
  if (typeof value === "object" && !Array.isArray(value)) {
    if (field.name === "MailingAddress" || field.name === "OtherAddress") {
      const addressParts = [];
      if (value.street) addressParts.push(value.street);
      if (value.city) addressParts.push(value.city);
      if (value.state) addressParts.push(value.state);
      if (value.postalCode) addressParts.push(value.postalCode);
      if (value.country) addressParts.push(value.country);
      const stringValue = addressParts.join(", ");

      notionProperty.rich_text = [
        {
          text: {
            content: stringValue || "",
          },
        },
      ];
    } else {
      const stringValue = JSON.stringify(value);

      notionProperty.rich_text = [
        {
          text: {
            content: stringValue || "",
          },
        },
      ];
    }

    return notionProperty;
  }

  // Map Salesforce field types to Notion properties
  switch (fieldType) {
    case "string":
    case "textarea":
    case "picklist":
    case "id":
    case "url":
    case "reference":
      if (field.label === NAME) {
        notionProperty.title = [
          {
            text: {
              content: value.toString(),
            },
          },
        ];
      } else {
        notionProperty.rich_text = [
          {
            text: {
              content: value.toString(),
            },
          },
        ];
      }
      break;
    case "email":
      notionProperty.email = value.toString();
      break;
    case "phone":
      notionProperty.phone_number = value.toString();
      break;
    case "boolean":
      notionProperty.checkbox = value;
      break;
    case "int":
    case "double":
    case "currency":
    case "percent":
      notionProperty.number = Number(value);
      break;
    case "date":
    case "datetime":
      notionProperty.date = {
        start: new Date(value).toISOString(),
      };
      break;
    default:
      notionProperty.rich_text = [
        {
          text: {
            content: value.toString(),
          },
        },
      ];
  }

  return notionProperty;
}

export function mapSalesforceFieldTypeToNotionPropertyType(field: Field): any {
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
      if (field.label === NAME) {
        return { title: {} };
      } else {
        return { rich_text: {} };
      }
  }
}

// Map Notion properties back to Salesforce fields
export function mapNotionPropertyToSalesforceField(
  field: Field,
  notionProperty: any
): any {
  const fieldType = field.type;

  if (notionProperty === undefined || notionProperty === null) {
    return null;
  }

  if (field.label === NAME && notionProperty.type === "title") {
    return null;
  }

  // Map Notion property types back to Salesforce field types
  switch (fieldType) {
    case "string":
    case "textarea":
    case "picklist":
    case "id":
    case "url":
    case "reference":
      if (notionProperty.type === "rich_text") {
        return notionProperty.rich_text?.[0]?.text?.content || null;
      } else if (notionProperty.type === "title") {
        return notionProperty.title?.[0]?.text?.content || null;
      } else {
        return null;
      }
    case "email":
      return notionProperty.email || null;
    case "phone":
      return notionProperty.phone_number || null;
    case "boolean":
      return notionProperty.checkbox;
    case "int":
    case "double":
    case "currency":
    case "percent":
      return notionProperty.number || null;
    case "date":
    case "datetime":
      return notionProperty.date?.start || null;
    default:
      return null;
  }
}
