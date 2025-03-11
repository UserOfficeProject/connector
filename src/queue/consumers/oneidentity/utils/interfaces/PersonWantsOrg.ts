export enum OrderState {
  ASSIGNED = 'Assigned',
  ABORTED = 'Aborted',
}

export enum PersonWantsOrgRole {
  SYSTEM_ACCESS = 'Experiment visit - system access',
  SITE_ACCESS = 'Experiment visit - site access',
}

export interface PersonWantsOrg {
  AdditionalData: string;
  CCC_CustomDate01: string;
  CCC_CustomPerson01: string;
  CheckResult: number;
  CheckResultDetail: string;
  CustomProperty01: string;
  CustomProperty02: string;
  CustomProperty03: string;
  CustomProperty04: string;
  CustomProperty05: string;
  CustomProperty06: string;
  CustomProperty07: string;
  CustomProperty08: string;
  CustomProperty09: string;
  CustomProperty10: string;
  DateActivated: string;
  DateDeactivated: string;
  DateHead: string;
  DecisionLevel: number;
  DisplayObjectKeyAssignment: string;
  DisplayOrg: PersonWantsOrgRole;
  DisplayOrgParent: string;
  DisplayOrgParentOfParent: string;
  DisplayPersonHead: string;
  DisplayPersonInserted: string;
  DisplayPersonOrdered: string;
  GenProcID: string;
  IsCrossFunctional: boolean;
  IsOptionalChild: boolean;
  IsOrderForWorkDesk: boolean;
  IsReserved: boolean;
  ObjectKeyAssignment: string;
  ObjectKeyElementUsedInAssign: string;
  ObjectKeyFinal: string;
  ObjectKeyOrdered: string;
  ObjectKeyOrgUsedInAssign: string;
  OrderDate: string;
  OrderDetail1: string;
  OrderDetail2: string;
  OrderReason: string;
  OrderState: OrderState;
  PeerGroupFactor: number;
  PWOPriority: number;
  Quantity: number;
  ReasonHead: string;
  Recommendation: number;
  RecommendationDetail: string;
  UID_Department: string;
  UID_ITShopOrgFinal: string;
  UID_Org: string;
  UID_OrgParent: string;
  UID_OrgParentOfParent: string;
  UID_PersonHead: string;
  UID_PersonInserted: string;
  UID_PersonOrdered: string;
  UID_PersonWantsOrg: string;
  UID_PersonWantsOrgParent: string;
  UID_ProfitCenter: string;
  UID_PWOState: string;
  UID_QERJustification: string;
  UID_QERJustificationOrder: string;
  UID_QERResourceType: string;
  UID_QERWorkingMethod: string;
  UID_ShoppingCartOrder: string;
  UID_WorkDeskOrdered: string;
  UiOrderState: string;
  ValidFrom: string;
  ValidUntil: string;
  ValidUntilProlongation: string;
  ValidUntilUnsubscribe: string;
  XDateInserted: string;
  XDateUpdated: string;
  XMarkedForDeletion: number;
  XObjectKey: string;
  XTouched: string;
  XUserInserted: string;
  XUserUpdated: string;
}
