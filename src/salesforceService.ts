import jsforce, { Field } from 'jsforce';
import dotenv from 'dotenv';
import { Contact } from './models';
dotenv.config();

export const conn = new jsforce.Connection({
  oauth2: {
    loginUrl: 'https://login.salesforce.com',
    clientId: process.env.SALESFORCE_CLIENT_ID,
    clientSecret: process.env.SALESFORCE_CLIENT_SECRET,
  },
});

export async function loginToSalesforce() {
  await conn.login(
    process.env.SALESFORCE_USERNAME || '',
    (process.env.SALESFORCE_PASSWORD || '') + (process.env.SALESFORCE_SECURITY_TOKEN || '')
  );
}

export async function getSalesforceContacts(fields: Field[]): Promise<Contact[]> {
    const fieldNames = fields.map((field) => field.name);
    const query = `SELECT ${fieldNames.join(', ')} FROM Contact`;
  
    const records = await conn.query<Contact>(query);
    return records.records;
  }
  