import { describe, expect, it } from 'vitest';
import { getPortraitValidationCode } from '@/lib/photo-validation';

describe('getPortraitValidationCode', () => {
  it('rejects when no face is found', () => {
    expect(
      getPortraitValidationCode({
        faceCount: 0,
        score: 0,
        keypointCount: 0,
        areaRatio: 0,
        centerX: 0,
        centerY: 0,
        brightness: 120,
        contrast: 40,
      }),
    ).toBe('no_face');
  });

  it('rejects low quality or unclear faces', () => {
    expect(
      getPortraitValidationCode({
        faceCount: 1,
        score: 0.5,
        keypointCount: 2,
        areaRatio: 0.18,
        centerX: 0.5,
        centerY: 0.45,
        brightness: 125,
        contrast: 35,
      }),
    ).toBe('unclear_face');
  });

  it('accepts a centered and well-lit portrait', () => {
    expect(
      getPortraitValidationCode({
        faceCount: 1,
        score: 0.92,
        keypointCount: 6,
        areaRatio: 0.2,
        centerX: 0.5,
        centerY: 0.45,
        brightness: 128,
        contrast: 40,
      }),
    ).toBeNull();
  });
});
