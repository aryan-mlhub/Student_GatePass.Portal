import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICampusConfig extends Document {
  campusName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CampusConfigSchema = new Schema<ICampusConfig>(
  {
    campusName: {
      type: String,
      required: true,
      default: 'S. B. Jain Institute of Technology, Nagpur',
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
      default: 21.2227,
    },
    longitude: {
      type: Number,
      required: true,
      default: 79.0494,
    },
    radiusMeters: {
      type: Number,
      required: true,
      default: 200,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const CampusConfig: Model<ICampusConfig> =
  mongoose.models.CampusConfig ||
  mongoose.model<ICampusConfig>('CampusConfig', CampusConfigSchema);
