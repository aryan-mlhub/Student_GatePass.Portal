import mongoose from 'mongoose';
import { User, IUser } from '../models/User.js';
import { Timetable, ITimetable, DayOfWeek } from '../models/Timetable.js';
import { TimetableOverride, ITimetableOverride } from '../models/TimetableOverride.js';
import { GatePass } from '../models/GatePass.js';
import { GeofenceService } from './geofenceService.js';
import { logger } from '../utils/logger.js';

export interface EvaluationInput {
  studentId: string; // Mongo ObjectId or studentId string (e.g. "SBJ-2026-AIML-042")
  timestamp?: Date;
  latitude: number;
  longitude: number;
}

export interface EvaluationResult {
  decision:
    | 'AUTO_APPROVED'
    | 'REQUIRES_APPROVAL'
    | 'REJECTED'
    | 'REJECT_LOCATION'
    | 'REJECT_DUPLICATE';
  reason: string;
  currentClass?: string | null;
  timetableStatus?: string;
  locationValid: boolean;
  distanceFromCampus: number;
  slotDetails?: {
    subject: string;
    subjectCode: string;
    startTime: string;
    endTime: string;
    room: string;
  };
  overrideApplied?: {
    type: string;
    reason: string;
  };
}

export class TimetableEngine {
  /**
   * Evaluates student exit request against live timetable, overrides, geofencing, and active passes.
   */
  public static async evaluateGatePassRequest(
    input: EvaluationInput
  ): Promise<EvaluationResult> {
    const checkTime = input.timestamp ? new Date(input.timestamp) : new Date();

    // 1. Find Student Record
    const student = await this.resolveStudent(input.studentId);
    if (!student) {
      throw new Error(`Student not found for identifier: ${input.studentId}`);
    }

    // 2. Geofence Validation (Haversine Distance Check)
    const geofence = await GeofenceService.isInsideCampus(input.latitude, input.longitude);
    if (!geofence.valid) {
      return {
        decision: 'REJECT_LOCATION',
        reason: `Student is outside campus boundary (${geofence.distanceMeters}m from campus center; allowed: ${geofence.allowedRadiusMeters}m).`,
        currentClass: null,
        timetableStatus: 'UNKNOWN',
        locationValid: false,
        distanceFromCampus: geofence.distanceMeters,
      };
    }

    // 3. Duplicate Active Pass Check
    const activePass = await GatePass.findOne({
      studentId: student._id,
      status: { $in: ['APPROVED', 'ACTIVE'] },
      expiresAt: { $gt: checkTime },
    });

    if (activePass) {
      return {
        decision: 'REJECT_DUPLICATE',
        reason: `Student already has an active gate pass (${activePass.passId}) valid until ${activePass.expiresAt.toLocaleTimeString()}.`,
        currentClass: null,
        timetableStatus: 'PASS_ACTIVE',
        locationValid: true,
        distanceFromCampus: geofence.distanceMeters,
      };
    }

    // 4. Extract Day and Time in Minutes
    const dayOfWeek = this.getDayOfWeek(checkTime);
    const totalMinutes = checkTime.getHours() * 60 + checkTime.getMinutes();
    const dateString = this.formatDateYYYYMMDD(checkTime);
    const section = student.section || 'B';
    const semester = student.semester || 3;

    logger.debug(
      `Evaluating Timetable: student=${student.studentId}, section=${section}, day=${dayOfWeek}, time=${checkTime.toTimeString().slice(0, 5)} (${totalMinutes} mins)`
    );

    // 5. Look for scheduled slot in student's section timetable
    const slot = await Timetable.findOne({
      section,
      semester,
      day: dayOfWeek,
      startMinutes: { $lte: totalMinutes },
      endMinutes: { $gt: totalMinutes },
    });

    // 6. Check Date-Specific Overrides
    if (slot) {
      const override = await TimetableOverride.findOne({
        date: dateString,
        $or: [
          { timetableId: slot._id },
          { section, date: dateString, type: { $in: ['CANCEL', 'RESCHEDULE'] } },
        ],
      }).sort({ createdAt: -1 });

      if (override) {
        if (override.type === 'CANCEL') {
          return {
            decision: 'AUTO_APPROVED',
            reason: `Current lecture has been cancelled: ${override.reason}`,
            currentClass: slot.subject,
            timetableStatus: 'CANCELLED',
            locationValid: true,
            distanceFromCampus: geofence.distanceMeters,
            slotDetails: {
              subject: slot.subject,
              subjectCode: slot.subjectCode,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: slot.room,
            },
            overrideApplied: {
              type: override.type,
              reason: override.reason,
            },
          };
        }

        if (override.type === 'RESCHEDULE') {
          return {
            decision: 'AUTO_APPROVED',
            reason: `Current lecture was rescheduled to ${override.newStartTime}-${override.newEndTime} (${override.reason}). Slot is currently free.`,
            currentClass: slot.subject,
            timetableStatus: 'RESCHEDULED',
            locationValid: true,
            distanceFromCampus: geofence.distanceMeters,
            slotDetails: {
              subject: slot.subject,
              subjectCode: slot.subjectCode,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: slot.room,
            },
            overrideApplied: {
              type: override.type,
              reason: override.reason,
            },
          };
        }
      }

      // Check slot status without override
      if (slot.status === 'FREE') {
        return {
          decision: 'AUTO_APPROVED',
          reason: 'Current period is a scheduled free period.',
          currentClass: slot.subject,
          timetableStatus: 'FREE',
          locationValid: true,
          distanceFromCampus: geofence.distanceMeters,
          slotDetails: {
            subject: slot.subject,
            subjectCode: slot.subjectCode,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
          },
        };
      }

      if (slot.status === 'BREAK') {
        return {
          decision: 'AUTO_APPROVED',
          reason: 'Current period is a scheduled break/recess.',
          currentClass: slot.subject,
          timetableStatus: 'BREAK',
          locationValid: true,
          distanceFromCampus: geofence.distanceMeters,
          slotDetails: {
            subject: slot.subject,
            subjectCode: slot.subjectCode,
            startTime: slot.startTime,
            endTime: slot.endTime,
            room: slot.room,
          },
        };
      }

      if (slot.status === 'CANCELLED') {
        return {
          decision: 'AUTO_APPROVED',
          reason: 'Current lecture is marked as cancelled in master timetable.',
          currentClass: slot.subject,
          timetableStatus: 'CANCELLED',
          locationValid: true,
          distanceFromCampus: geofence.distanceMeters,
        };
      }

      // Slot is ACTIVE lecture -> Requires Warden Approval
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: `Active lecture in progress: ${slot.subject} (${slot.subjectCode}) in ${slot.room}. Requires Warden approval.`,
        currentClass: slot.subject,
        timetableStatus: 'ACTIVE',
        locationValid: true,
        distanceFromCampus: geofence.distanceMeters,
        slotDetails: {
          subject: slot.subject,
          subjectCode: slot.subjectCode,
          startTime: slot.startTime,
          endTime: slot.endTime,
          room: slot.room,
        },
      };
    }

    // 7. If no default slot found at this time, check if an ADD override exists
    const addOverride = await TimetableOverride.findOne({
      date: dateString,
      section,
      type: 'ADD',
      newStartMinutes: { $lte: totalMinutes },
      newEndMinutes: { $gt: totalMinutes },
    });

    if (addOverride) {
      return {
        decision: 'REQUIRES_APPROVAL',
        reason: `Active additional lecture in progress: ${addOverride.newSubject || 'Extra Class'} (${addOverride.reason}). Requires Warden approval.`,
        currentClass: addOverride.newSubject || 'Extra Class',
        timetableStatus: 'ACTIVE',
        locationValid: true,
        distanceFromCampus: geofence.distanceMeters,
        overrideApplied: {
          type: addOverride.type,
          reason: addOverride.reason,
        },
      };
    }

    // Case: No lecture scheduled at this hour -> Free period -> Auto-Approve
    return {
      decision: 'AUTO_APPROVED',
      reason: 'Free period. No active lecture scheduled at this time.',
      currentClass: null,
      timetableStatus: 'FREE',
      locationValid: true,
      distanceFromCampus: geofence.distanceMeters,
    };
  }

  /**
   * Retrieves live current status, active lecture, and upcoming lecture for a student.
   */
  public static async getCurrentStudentTimetableStatus(
    studentId: string,
    timestamp?: Date
  ): Promise<{
    currentClass: {
      subject: string;
      subjectCode?: string;
      startTime: string;
      endTime: string;
      room?: string;
      status: string;
    } | null;
    nextClass: {
      subject: string;
      subjectCode?: string;
      startTime: string;
      endTime?: string;
      room?: string;
    } | null;
    isFreePeriod: boolean;
  }> {
    const checkTime = timestamp ? new Date(timestamp) : new Date();
    const student = await this.resolveStudent(studentId);
    if (!student) {
      throw new Error(`Student not found for identifier: ${studentId}`);
    }

    const dayOfWeek = this.getDayOfWeek(checkTime);
    const totalMinutes = checkTime.getHours() * 60 + checkTime.getMinutes();
    const dateString = this.formatDateYYYYMMDD(checkTime);
    const section = student.section || 'B';
    const semester = student.semester || 3;

    // Current slot
    const currentSlot = await Timetable.findOne({
      section,
      semester,
      day: dayOfWeek,
      startMinutes: { $lte: totalMinutes },
      endMinutes: { $gt: totalMinutes },
    });

    let currentStatus = currentSlot ? currentSlot.status : 'FREE';
    let currentSubject = currentSlot ? currentSlot.subject : null;

    if (currentSlot) {
      const override = await TimetableOverride.findOne({
        date: dateString,
        $or: [{ timetableId: currentSlot._id }, { section, date: dateString, type: 'CANCEL' }],
      });
      if (override) {
        if (override.type === 'CANCEL') {
          currentStatus = 'CANCELLED';
        } else if (override.type === 'RESCHEDULE') {
          currentStatus = 'RESCHEDULED';
        }
      }
    }

    // Next slot
    const nextSlot = await Timetable.findOne({
      section,
      semester,
      day: dayOfWeek,
      startMinutes: { $gte: totalMinutes },
      status: { $in: ['ACTIVE', 'FREE'] },
    }).sort({ startMinutes: 1 });

    const isFree =
      !currentSlot ||
      currentStatus === 'FREE' ||
      currentStatus === 'BREAK' ||
      currentStatus === 'CANCELLED' ||
      currentStatus === 'RESCHEDULED';

    return {
      currentClass: currentSlot
        ? {
            subject: currentSlot.subject,
            subjectCode: currentSlot.subjectCode,
            startTime: currentSlot.startTime,
            endTime: currentSlot.endTime,
            room: currentSlot.room,
            status: currentStatus,
          }
        : null,
      nextClass: nextSlot
        ? {
            subject: nextSlot.subject,
            subjectCode: nextSlot.subjectCode,
            startTime: nextSlot.startTime,
            endTime: nextSlot.endTime,
            room: nextSlot.room,
          }
        : null,
      isFreePeriod: isFree,
    };
  }

  public static getDayOfWeek(date: Date): DayOfWeek {
    const days: DayOfWeek[] = [
      'SUNDAY',
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
    ];
    return days[date.getDay()];
  }

  public static formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public static async resolveStudent(identifier: string): Promise<IUser | null> {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      const user = await User.findById(identifier);
      if (user) return user;
    }
    return User.findOne({
      $or: [{ studentId: identifier.toUpperCase() }, { email: identifier.toLowerCase() }],
    });
  }
}
