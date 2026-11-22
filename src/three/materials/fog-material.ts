import {
  DataTexture,
  LinearFilter,
  RedFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector4,
} from "three";
import { fogFragment, fogVertex } from "../shaders/fog";

export function maskTexture(mask: Uint8Array, size: number): DataTexture {
  const texture = new DataTexture(mask, size, size, RedFormat, UnsignedByteType);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Token colors arrive from the CSS variables as hex, which the CSS build writes in 3, 4, 6 or
// 8 digits, or as space-separated RGB with an alpha. They go to the shader as plain sRGB, because
// MapLibre blends in sRGB too and no color conversion runs on either path.
export function colorVector(value: string): Vector4 {
  if (value.startsWith("#")) {
    const digits = value.slice(1);
    const hex = digits.length <= 4 ? [...digits].map((c) => c + c).join("") : digits;
    const [r, g, b, a = 255] = (hex.match(/../g) ?? []).map((h) => parseInt(h, 16));
    return new Vector4(r / 255, g / 255, b / 255, a / 255);
  }
  const [r, g, b, a = 1] = (value.match(/[\d.]+/g) ?? []).map(Number);
  return new Vector4(r / 255, g / 255, b / 255, a);
}

export type FogColors = { fog: string; edge: string };

export function fogMaterial(options: {
  mask: DataTexture;
  octaves: number;
  aspect: number;
  colors: FogColors;
}): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: fogVertex,
    fragmentShader: fogFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uMaskBefore: { value: options.mask },
      uMaskAfter: { value: options.mask },
      uFogColor: { value: colorVector(options.colors.fog) },
      uEdgeColor: { value: colorVector(options.colors.edge) },
      uTime: { value: 0 },
      uOctaves: { value: options.octaves },
      uProgress: { value: 1 },
      uRadial: { value: 1 },
      uRevealCenter: { value: new Vector2(0.5, 0.5) },
      uRevealReach: { value: 0 },
      uPointer: { value: new Vector2(-1, -1) },
      uPointerRadius: { value: 0.02 },
      uAspect: { value: options.aspect },
    },
  });
}
