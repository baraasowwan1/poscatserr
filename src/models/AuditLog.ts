import mongoose, { Document, Schema } from "mongoose";

export interface IAuditLog extends Document {
  storeId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ip: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  storeId:  { type: String, required: true },
  userId:   { type: String, default: "" },
  userName: { type: String, default: "" },
  action:   { type: String, required: true },
  entity:   { type: String, default: "" },
  entityId: { type: String, default: "" },
  details:  { type: String, default: "" },
  ip:       { type: String, default: "" },
}, { timestamps: true });

AuditLogSchema.index({ storeId: 1, createdAt: -1 });

export default mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
