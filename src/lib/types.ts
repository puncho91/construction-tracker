export type Discipline = "Architectural"|"Structural"|"Electrical"|"ACMV"|"Plumbing"|"Firefighting"|"External";
export interface Project { id:string; name:string; employer:string; contractor:string; consultant:string; commenceDate:string; originalCompletion:string; timeExtensionDays:number; reportingDate:string; }
export interface Package { id:string; code:string; name:string; discipline:Discipline; }
export interface BoqItem { id:string; packageId:string; code:string; description:string; unit:string; contractAmount:number; previousExecuted:number; thisPeriodExecuted:number; }
export type SnagType="SI"|"Snag"; export type SnagStatus="Open"|"In Progress"|"Closed";
export interface Snag { id:string; type:SnagType; ref:string; discipline:Discipline; description:string; deadline:string; status:SnagStatus; createdAt:string; }
export interface Manpower { trade:string; count:number; }
export interface DailyReport { id:string; date:string; weather:string; disciplineFocus:Discipline; manpower:Manpower[]; accomplishments:string; notes:string; snapshotOverallPct:number; snapshotExecuted:number; }
export interface InspectionItem { id:string; label:string; passed:boolean; }
export interface Inspection { id:string; discipline:Discipline; date:string; inspector:string; items:InspectionItem[]; notes:string; }