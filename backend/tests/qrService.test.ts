import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import { QRService } from '../src/services/qrService.js';
import { IGatePass } from '../models/GatePass.js';

describe('QR Cryptographic Service & Signature Verification', () => {
  const mockPass: Partial<IGatePass> = {
    passId: 'GP-1042',
    studentId: new mongoose.Types.ObjectId(),
    gateId: 'MAIN_GATE',
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 1800000), // 30 mins
  };

  it('should generate a valid signed JWT containing pass metadata', () => {
    const token = QRService.generatePassQRToken(mockPass as IGatePass);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const payload = QRService.verifyPassQRToken(token);
    expect(payload.passId).toBe('GP-1042');
    expect(payload.gateId).toBe('MAIN_GATE');
    expect(payload.purpose).toBe('CAMPUS_EXIT');
  });

  it('should generate a valid QR code Data URL image string', async () => {
    const token = QRService.generatePassQRToken(mockPass as IGatePass);
    const dataUrl = await QRService.generateQRCodeImage(token);

    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('should reject expired QR tokens', () => {
    const expiredPass: Partial<IGatePass> = {
      passId: 'GP-9999',
      studentId: new mongoose.Types.ObjectId(),
      gateId: 'MAIN_GATE',
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() - 1800000), // Expired 30 mins ago
    };

    const token = QRService.generatePassQRToken(expiredPass as IGatePass);

    expect(() => QRService.verifyPassQRToken(token)).toThrow(/expired/i);
  });

  it('should reject tampered or invalid signature QR tokens', () => {
    const token = QRService.generatePassQRToken(mockPass as IGatePass);
    const tampered = token.slice(0, -6) + 'abcdef';

    expect(() => QRService.verifyPassQRToken(tampered)).toThrow(/signature|format/i);
  });
});
