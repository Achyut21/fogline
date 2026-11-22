import { type CustomLayerInterface, type Map } from "maplibre-gl";
import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Mesh,
  Scene,
  WebGLRenderer,
  type ShaderMaterial,
} from "three";
import { fogExtent, maskUv, mercator, type FogField } from "./fog-field";

// Approach A (DESIGN section 9, D-058): three.js draws into MapLibre's own WebGL context as a
// custom layer, so the fog sits between the basemap and the T-line layers added after it. The quad
// spans fogExtent; its uv runs past 0..1 outside the mask, where the shader draws plain fog.
export function fogLayer(material: ShaderMaterial, field: FogField): CustomLayerInterface {
  const nw = mercator(fogExtent.west, fogExtent.north);
  const se = mercator(fogExtent.east, fogExtent.south);
  const [u0, v0] = maskUv(fogExtent.west, fogExtent.north);
  const [u1, v1] = maskUv(fogExtent.east, fogExtent.south);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([nw.x, nw.y, 0, se.x, nw.y, 0, nw.x, se.y, 0, se.x, se.y, 0]),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new BufferAttribute(new Float32Array([u0, v0, u1, v0, u0, v1, u1, v1]), 2),
  );
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new Scene();
  scene.add(mesh);
  const camera = new Camera();
  let renderer: WebGLRenderer | null = null;
  let map: Map | null = null;

  return {
    id: "fog",
    type: "custom",
    renderingMode: "2d",
    onAdd(m, gl) {
      map = m;
      renderer = new WebGLRenderer({ canvas: m.getCanvas(), context: gl });
      renderer.autoClear = false;
    },
    render(_gl, args) {
      if (!renderer || !map) return;
      camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix);
      field.tick(performance.now());
      renderer.resetState();
      renderer.render(scene, camera);
      if (field.animating()) map.triggerRepaint();
    },
    onRemove() {
      material.uniforms.uMaskBefore.value.dispose();
      material.uniforms.uMaskAfter.value.dispose();
      material.dispose();
      geometry.dispose();
      renderer?.dispose();
      renderer = null;
      map = null;
    },
  };
}
