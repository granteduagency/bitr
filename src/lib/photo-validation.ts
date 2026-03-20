import i18n from '@/i18n/config';

const MEDIAPIPE_BUNDLE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/vision_bundle.mjs';
const MEDIAPIPE_WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm';
const FACE_DETECTOR_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

type PortraitValidationCode =
  | 'image_only'
  | 'no_face'
  | 'multiple_faces'
  | 'unclear_face'
  | 'face_too_small'
  | 'face_off_center'
  | 'poor_lighting';

interface PortraitMetrics {
  faceCount: number;
  score: number;
  keypointCount: number;
  areaRatio: number;
  centerX: number;
  centerY: number;
  brightness: number;
  contrast: number;
}

interface Detection {
  categories: Array<{ score?: number }>;
  boundingBox?: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  keypoints: Array<{ x: number; y: number }>;
}

interface FaceDetectorInstance {
  detect(image: HTMLImageElement): { detections: Detection[] };
}

type MediaPipeVisionModule = {
  FilesetResolver: {
    forVisionTasks(wasmRoot: string): Promise<unknown>;
  };
  FaceDetector: {
    createFromOptions(
      wasmFileset: unknown,
      options: {
        baseOptions: {
          modelAssetPath: string;
          delegate: 'CPU' | 'GPU';
        };
        runningMode: 'IMAGE' | 'VIDEO';
        minDetectionConfidence: number;
        minSuppressionThreshold: number;
      },
    ): Promise<FaceDetectorInstance>;
  };
};

let faceDetectorPromise: Promise<FaceDetectorInstance> | null = null;

const getValidationMessage = (code: PortraitValidationCode) =>
  i18n.t(`form.photoValidation.${code}`);

const loadImageElement = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error(getValidationMessage('unclear_face')));
    };

    image.src = imageUrl;
  });

const measureImageQuality = (image: HTMLImageElement) => {
  const maxSize = 256;
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    return { brightness: 128, contrast: 32 };
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const { data } = context.getImageData(0, 0, width, height);
  const pixels = data.length / 4;
  let total = 0;
  let totalSquares = 0;

  for (let index = 0; index < data.length; index += 4) {
    const luminance = 0.2126 * data[index] + 0.7152 * data[index + 1] + 0.0722 * data[index + 2];
    total += luminance;
    totalSquares += luminance * luminance;
  }

  const brightness = total / pixels;
  const variance = Math.max(0, totalSquares / pixels - brightness * brightness);

  return {
    brightness,
    contrast: Math.sqrt(variance),
  };
};

const buildPortraitMetrics = (
  detection: Detection | undefined,
  imageWidth: number,
  imageHeight: number,
  quality: { brightness: number; contrast: number },
  faceCount: number,
): PortraitMetrics => {
  const boundingBox = detection?.boundingBox;
  const width = boundingBox?.width ?? 0;
  const height = boundingBox?.height ?? 0;

  return {
    faceCount,
    score: detection?.categories[0]?.score ?? 0,
    keypointCount: detection?.keypoints.length ?? 0,
    areaRatio: imageWidth > 0 && imageHeight > 0 ? (width * height) / (imageWidth * imageHeight) : 0,
    centerX: boundingBox ? (boundingBox.originX + width / 2) / imageWidth : 0,
    centerY: boundingBox ? (boundingBox.originY + height / 2) / imageHeight : 0,
    brightness: quality.brightness,
    contrast: quality.contrast,
  };
};

export function getPortraitValidationCode(metrics: PortraitMetrics): PortraitValidationCode | null {
  if (metrics.faceCount === 0) {
    return 'no_face';
  }

  if (metrics.faceCount > 1) {
    return 'multiple_faces';
  }

  if (metrics.score < 0.7 || metrics.keypointCount < 4) {
    return 'unclear_face';
  }

  if (metrics.areaRatio < 0.08) {
    return 'face_too_small';
  }

  if (metrics.centerX < 0.24 || metrics.centerX > 0.76 || metrics.centerY < 0.18 || metrics.centerY > 0.72) {
    return 'face_off_center';
  }

  if (metrics.brightness < 45 || metrics.brightness > 230 || metrics.contrast < 20) {
    return 'poor_lighting';
  }

  return null;
}

async function getFaceDetector() {
  if (!faceDetectorPromise) {
    faceDetectorPromise = (async () => {
      const visionModule = await import(/* @vite-ignore */ MEDIAPIPE_BUNDLE_URL) as MediaPipeVisionModule;
      const { FilesetResolver, FaceDetector } = visionModule;
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_ROOT);
      return FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_DETECTOR_MODEL_PATH,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.65,
        minSuppressionThreshold: 0.3,
      });
    })();
  }

  return faceDetectorPromise;
}

export async function validatePortraitPhoto(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error(getValidationMessage('image_only'));
  }

  const image = await loadImageElement(file);

  try {
    const detector = await getFaceDetector();
    const result = detector.detect(image);
    const metrics = buildPortraitMetrics(
      result.detections[0],
      image.naturalWidth,
      image.naturalHeight,
      measureImageQuality(image),
      result.detections.length,
    );
    const validationCode = getPortraitValidationCode(metrics);

    if (validationCode) {
      throw new Error(getValidationMessage(validationCode));
    }
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }

    throw new Error(getValidationMessage('unclear_face'));
  }
}
