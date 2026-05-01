// Barrel for the data-access layer.
//
// Consumers import domain namespaces:
//   import { marketing, reporting, sales } from "@/lib/api";
//   await marketing.saveMonthlyData(input);
//
// The shared Result contract is re-exported for hook/callsite convenience.

export * as crm from "./crm";
export * as dashboard from "./dashboard";
export * as history from "./history";
export * as marketing from "./marketing";
export * as operationalAlerts from "./operationalAlerts";
export * as ownerEntities from "./ownerEntities";
export * as payments from "./payments";
export * as reservations from "./reservations";
export * as reporting from "./reporting";
export * as sales from "./sales";
export * as unitDetail from "./unitDetail";
export * as units from "./units";
export * as unitsRegistry from "./unitsRegistry";
export * as unitsShell from "./unitsShell";

export type { ApiResult } from "./_types";
