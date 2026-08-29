import { Router } from 'express';
import {
  TimetableController,
  createSlotSchema,
  cancelLectureSchema,
  rescheduleLectureSchema,
  addLectureSchema,
} from '../controllers/timetableController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeRole } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';

export const timetableRouter = Router();

// Public / Authenticated read
timetableRouter.get('/', TimetableController.getTimetable);

// Protected Admin / Warden routes
timetableRouter.use(authenticate);
timetableRouter.use(authorizeRole('ADMIN', 'WARDEN'));

timetableRouter.post('/', validate(createSlotSchema), TimetableController.createSlot);
timetableRouter.put('/:id', TimetableController.updateSlot);
timetableRouter.delete('/:id', TimetableController.deleteSlot);

timetableRouter.post('/cancel', validate(cancelLectureSchema), TimetableController.cancelLecture);
timetableRouter.post('/reschedule', validate(rescheduleLectureSchema), TimetableController.rescheduleLecture);
timetableRouter.post('/add', validate(addLectureSchema), TimetableController.addLecture);
