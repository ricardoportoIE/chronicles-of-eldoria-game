import {
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
} from "three";

export function mountRealmMark(container) {
  if (!container || !globalThis.WebGLRenderingContext) return;

  const size = Math.max(container.clientWidth, 30);
  const scene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 2.8;

  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
  renderer.setSize(size, size);
  container.replaceChildren(renderer.domElement);

  const texture = new TextureLoader().load("/2k_earth_daymap.jpg");
  texture.colorSpace = SRGBColorSpace;
  const globe = new Mesh(
    new SphereGeometry(0.82, 32, 20),
    new MeshBasicMaterial({ map: texture }),
  );
  globe.rotation.z = 0.12;
  scene.add(globe);

  const prefersReducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let frame;
  function render() {
    if (!prefersReducedMotion) globe.rotation.y += 0.004;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  }
  render();

  const observer = new ResizeObserver(([entry]) => {
    const nextSize = Math.max(Math.round(entry.contentRect.width), 30);
    renderer.setSize(nextSize, nextSize, false);
  });
  observer.observe(container);

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
    texture.dispose();
    globe.geometry.dispose();
    globe.material.dispose();
    renderer.dispose();
  }, { once: true });
}
