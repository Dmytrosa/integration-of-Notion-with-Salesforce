export interface Contact {
   [key: string]: any; 
  Id: string;
  IsDeleted: boolean;
  MasterRecordId?: string;
  AccountId?: string;
  LastName: string;
  FirstName?: string;
  Salutation?: string;
  Name: string;
  OtherStreet?: string;
  OtherCity?: string;
  OtherState?: string;
  OtherPostalCode?: string;
  OtherCountry?: string;
  OtherLatitude?: number;
  OtherLongitude?: number;
  OtherGeocodeAccuracy?: string;
  OtherAddress?: any;
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  MailingLatitude?: number;
  MailingLongitude?: number;
  MailingGeocodeAccuracy?: string;
  MailingAddress?: any;
  Phone?: string;
  Fax?: string;
  MobilePhone?: string;
  HomePhone?: string;
  OtherPhone?: string;
  AssistantPhone?: string;
  ReportsToId?: string;
  Email?: string;
  Title?: string;
  Department?: string;
  AssistantName?: string;
  LeadSource?: string;
  Birthdate?: string;
  Description?: string;
  OwnerId: string;
  CreatedDate: string;
  CreatedById: string;
  LastModifiedDate: string;
  LastModifiedById: string;
  SystemModstamp: string;
  LastActivityDate?: string;
  LastCURequestDate?: string;
  LastCUUpdateDate?: string;
  LastViewedDate?: string;
  LastReferencedDate?: string;
  EmailBouncedReason?: string;
  EmailBouncedDate?: string;
  IsEmailBounced: boolean;
  PhotoUrl?: string;
  Jigsaw?: string;
  JigsawContactId?: string;
  CleanStatus?: string;
  IndividualId?: string;
  Level__c?: string;
  Languages__c?: string;
}