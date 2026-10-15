import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { RELOCK_AFTER_MS, authenticate, lockAvailable } from './appLock';

const hardware = jest.mocked(LocalAuthentication.hasHardwareAsync);
const enrolled = jest.mocked(LocalAuthentication.isEnrolledAsync);
const check = jest.mocked(LocalAuthentication.authenticateAsync);

beforeEach(() => {
  jest.clearAllMocks();
  hardware.mockResolvedValue(true);
  enrolled.mockResolvedValue(true);
});

describe('lockAvailable', () => {
  it('is true with the hardware and something set up', async () => {
    expect(await lockAvailable()).toBe(true);
  });

  it.each([
    ['no hardware', false, true],
    ['nothing set up', true, false],
    ['neither', false, false],
  ])('is false with %s', async (_name, hasHardware, isEnrolled) => {
    hardware.mockResolvedValue(hasHardware);
    enrolled.mockResolvedValue(isEnrolled);

    expect(await lockAvailable()).toBe(false);
  });

  it('is false in a browser, without asking the device', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');

    expect(await lockAvailable()).toBe(false);
    expect(hardware).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe('authenticate', () => {
  it('is true only when the system says the check succeeded', async () => {
    expect(await authenticate()).toBe(true);

    check.mockResolvedValueOnce({ success: false, error: 'user_cancel' } as never);
    expect(await authenticate()).toBe(false);
  });

  it('asks with the words it was given, and offers a Cancel', async () => {
    await authenticate('Turn on the app lock');

    expect(check).toHaveBeenCalledWith({ promptMessage: 'Turn on the app lock', cancelLabel: 'Cancel' });
  });

  it('is false, and does not throw, when the system fails', async () => {
    check.mockRejectedValueOnce(new Error('sensor error'));
    await expect(authenticate()).resolves.toBe(false);
  });
});

describe('the promises made to the person', () => {
  it('asks again after a minute away, as the settings screen says', () => {
    expect(RELOCK_AFTER_MS).toBe(60_000);
  });
});
