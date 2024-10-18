# Salesforce to Notion Migration Script

A **Node.js** script to migrate data from **Salesforce** to **Notion**, with progress tracking via **MongoDB**.

## Prerequisites

Make sure you have the following before you proceed:

- **Node.js** (v14 or higher)
- **npm** (Node Package Manager)
- **MongoDB** (local or cloud instance)
- **Salesforce** account with API access
  - [Salesforce Developer Center](https://developer.salesforce.com/developer-centers/integration-apis)
  - [YouTube Tutorial on Salesforce API](https://www.youtube.com/watch?v=ppkyQkoetCE)
- **Notion** account with an internal integration
  - [Notion Developers](https://developers.notion.com/)
  - [Notion API Documentation](https://developers.notion.com/reference/intro)

### Required Libraries

- **[jsforce](https://jsforce.github.io/)**: Simplifies interaction with Salesforce.
- **[@notionhq/client](https://github.com/makenotion/notion-sdk-js)**: Official Notion API client for Node.js.

## Setup Guide

Follow these steps to set up and run the script:

1. Clone the Repository

```bash
git clone https://github.com/Dmytrosa/integration-of-Notion-with-Salesforce
cd testtaskNotion

2. Install Dependencies
Run the following command to install the required Node.js dependencies:
npm install

3. Configure Environment Variables
Create a .env file in the root directory of the project and add the following variables, replacing the placeholder values with your actual credentials and IDs:
SALESFORCE_USERNAME=
SALESFORCE_PASSWORD=
SALESFORCE_SECURITY_TOKEN=
SALESFORCE_CLIENT_ID=
SALESFORCE_CLIENT_SECRET=
NOTION_TOKEN=
NOTION_PARENT_PAGE_ID=
MONGODB_URI=

4. Run the Script
To generate interfaces and execute the migration, follow these steps:

First, set your working entities using the package.json scripts. Add or verify the following commands:
"scripts": {
    "generate-interfaces": "npm run generate-interfaces-task",
    "generate-interfaces-task": "ts-node src/generateInterfaces.ts Task"
}

Now, to run the migration process:
npm run master


Script Overview

This script allows you to seamlessly transfer data from Salesforce to Notion, with the following features:

Salesforce Data Retrieval: Fetch data from Salesforce using the jsforce library.
Notion Data Insertion: Insert Salesforce data into Notion pages using the @notionhq/client library.
MongoDB Progress Tracking: Track migration progress in MongoDB for persistence and future reference.


Useful Links

Salesforce API Documentation:
    Salesforce Developer Center
    https://developer.salesforce.com/developer-centers/integration-apis
  https://www.youtube.com/watch?v=ppkyQkoetCE
    jsforce Library: Simplifies interaction with Salesforce.

Notion API Documentation:
    Notion Developers
    https://developers.notion.com/
    @notionhq/client Library: Official Notion API client for Node.js.
    Documentation: Notion API Documentation

```
