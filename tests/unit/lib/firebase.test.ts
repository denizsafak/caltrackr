import { connectAuthEmulator } from 'firebase/auth';
import { connectFirestoreEmulator } from 'firebase/firestore';

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  connectAuthEmulator: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
}));

describe('Firebase initialization', () => {
  beforeEach(() => {
    jest.resetModules();
    delete globalThis.__caltrackrEmulatorsConnected;
  });

  it('connects to emulators when enabled', () => {
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS = 'true';
    const { connectAuthEmulator } = require('firebase/auth');
    const { connectFirestoreEmulator } = require('firebase/firestore');
    require('@/lib/firebase');
    expect(connectAuthEmulator).toHaveBeenCalled();
    expect(connectFirestoreEmulator).toHaveBeenCalled();
    expect(globalThis.__caltrackrEmulatorsConnected).toBe(true);
  });

  it('handles emulator connection errors', () => {
    process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATORS = 'true';
    const { connectAuthEmulator } = require('firebase/auth');
    connectAuthEmulator.mockImplementationOnce(() => {
      throw new Error('Already connected');
    });
    
    require('@/lib/firebase');
    expect(connectAuthEmulator).toHaveBeenCalled();
    expect(globalThis.__caltrackrEmulatorsConnected).toBe(true);
  });
});
