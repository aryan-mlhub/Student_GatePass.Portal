import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { env } from '../config/env.js';
import { IGatePass } from '../models/GatePass.js';

export interface QRPayload {
  passId: string;
  studentId: string;
  gateId: string;
  issuedAt: number;
  expiresAt: number;
  purpose: string;
}

export class QRService {
  /**
   * Generates a cryptographically signed JWT token for the gate pass.
   * Uses dedicated QR_SECRET.
   */
  public static generatePassQRToken(pass: IGatePass): string {
    const issuedAt = Math.floor((pass.issuedAt || new Date()).getTime() / 1000);
    const expiresAt = Math.floor(pass.expiresAt.getTime() / 1000);

    const payload: QRPayload = {
      passId: pass.passId,
      studentId: pass.studentId.toString(),
      gateId: pass.gateId || 'MAIN_GATE',
      issuedAt,
      expiresAt,
      purpose: 'CAMPUS_EXIT',
    };

    return jwt.sign(
      {
        ...payload,
        iat: issuedAt,
        exp: expiresAt,
      },
      env.QR_SECRET
    );
  }

  /**
   * Generates a Data URL image string for visual QR rendering.
   */
  public static async generateQRCodeImage(token: string): Promise<string> {
    return QRCode.toDataURL(token, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 256,
    });
  }

  /**
   * Verifies and decodes the signed QR token.
   * Throws errors for expired, invalid, or tampered tokens.
   */
  public static verifyPassQRToken(token: string): QRPayload {
    try {
      const decoded = jwt.verify(token, env.QR_SECRET) as QRPayload;

      if (!decoded.passId || decoded.purpose !== 'CAMPUS_EXIT') {
        throw new Error('Invalid QR token payload format.');
      }

      return decoded;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        const error = new Error('QR code has expired.');
        (error as any).code = 'QR_EXPIRED';
        throw error;
      }
      const error = new Error('Invalid QR token signature or format.');
      (error as any).code = 'INVALID_QR_TOKEN';
      throw error;
    }
  }
}
