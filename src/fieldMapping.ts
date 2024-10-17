import { Field } from 'jsforce';

export function mapSalesforceFieldToNotionProperty(
  field: Field,
  value: any
): any {
  const fieldType = field.type;
  const notionProperty: any = {};

  // Check if value is null or undefined
  if (value === null || value === undefined) {
    return null;
  }

  // Handle object fields
  if (typeof value === 'object' && !Array.isArray(value)) {
    // For addresses or other complex objects
    if (field.name === 'MailingAddress' || field.name === 'OtherAddress') {
      const addressParts = [];
      if (value.street) addressParts.push(value.street);
      if (value.city) addressParts.push(value.city);
      if (value.state) addressParts.push(value.state);
      if (value.postalCode) addressParts.push(value.postalCode);
      if (value.country) addressParts.push(value.country);
      const stringValue = addressParts.join(', ');

      notionProperty.rich_text = [
        {
          text: {
            content: stringValue || '',
          },
        },
      ];
    } else {
      // For other objects, serialize to JSON string
      const stringValue = JSON.stringify(value);

      notionProperty.rich_text = [
        {
          text: {
            content: stringValue || '',
          },
        },
      ];
    }

    return notionProperty;
  }

  // Handle other field types
  switch (fieldType) {
    case 'string':
    case 'textarea':
    case 'picklist':
    case 'id':
    case 'url':
    case 'reference':
      notionProperty.rich_text = [
        {
          text: {
            content: value.toString(),
          },
        },
      ];
      break;
    case 'email':
      notionProperty.email = value.toString();
      break;
    case 'phone':
      notionProperty.phone_number = value.toString();
      break;
    case 'boolean':
      notionProperty.checkbox = value;
      break;
    case 'int':
    case 'double':
    case 'currency':
    case 'percent':
      notionProperty.number = Number(value);
      break;
    case 'date':
    case 'datetime':
      notionProperty.date = {
        start: new Date(value).toISOString(),
      };
      break;
    default:
      // Default to rich_text with string value
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
