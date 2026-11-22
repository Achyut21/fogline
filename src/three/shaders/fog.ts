// Fog over the map (DESIGN section 9). Density comes from two masks: before and after the latest
// reveal. A radial reveal burns the fog off outward from uRevealCenter with a bright edge; with
// reduced motion the masks crossfade instead. uv (0, 0) is the north-west corner of the mask.

export const fogVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fogFragment = /* glsl */ `
  uniform sampler2D uMaskBefore;
  uniform sampler2D uMaskAfter;
  uniform vec4 uFogColor;
  uniform vec4 uEdgeColor;
  uniform float uTime;
  uniform float uOctaves;
  uniform float uProgress;
  uniform float uRadial;
  uniform vec2 uRevealCenter;
  uniform float uRevealReach;
  uniform vec2 uPointer;
  uniform float uPointerRadius;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 3; i++) {
      if (float(i) >= uOctaves) break;
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    if (vUv.x < 0.0 || vUv.x > 1.0 || vUv.y < 0.0 || vUv.y > 1.0) {
      gl_FragColor = vec4(uFogColor.rgb, 0.92);
      return;
    }
    float before = texture2D(uMaskBefore, vUv).r;
    float after = texture2D(uMaskAfter, vUv).r;
    vec2 scaled = vec2(vUv.x * uAspect, vUv.y);
    float d = distance(scaled, vec2(uRevealCenter.x * uAspect, uRevealCenter.y));
    float band = 0.0062;
    float front = uProgress * (uRevealReach + band);
    float inside = 1.0 - smoothstep(front - band, front, d);
    float density = uRadial > 0.5 ? mix(before, after, inside) : mix(before, after, uProgress);
    float edge = uRadial > 0.5 ? (before - after) * (1.0 - smoothstep(0.0, band, abs(d - front))) * (1.0 - uProgress) : 0.0;

    if (uPointer.x >= 0.0) {
      float near = distance(scaled, vec2(uPointer.x * uAspect, uPointer.y));
      density *= mix(0.55, 1.0, smoothstep(0.0, uPointerRadius, near));
    }

    float drift = fbm(vUv * vec2(54.5 * uAspect, 54.5) + vec2(uTime * 0.035, uTime * 0.0214));
    float alpha = clamp(density * (0.72 + 0.4 * drift), 0.0, 0.97);
    vec3 color = mix(uFogColor.rgb, uEdgeColor.rgb, clamp(edge * 1.6, 0.0, 1.0));
    gl_FragColor = vec4(color, max(alpha, clamp(edge, 0.0, 1.0) * uEdgeColor.a));
  }
`;
