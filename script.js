import * as THREE from "three";
import { OrbitControls } from "orbitcontrols";
import { DragControls } from "dragcontrols";
import { GUI } from "lil-gui";



// ========== threejs setup ==========

// Scene, renderer, camera
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8f8f8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 1);

// Grid floor
scene.add(new THREE.GridHelper(20, 20));

// Lighting
const sun = new THREE.DirectionalLight(0xffffff, 0.5);
sun.position.set(1, 1, 1).normalize();
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x606040, 0x404060));




// ======== baseball model variables ========

const baseball = new THREE.Mesh(
  new THREE.SphereGeometry(36.5e-3, 32, 16),
  new THREE.MeshStandardMaterial()
);
scene.add(baseball);

const velocity = new THREE.Vector3();

const direction = new THREE.Vector3(0, 1, 0); // throw direction



// ======== controls ========

// Camera orbit
const orbitControls = new OrbitControls(camera, renderer.domElement);

// Ball & arrow to change direction
const directionHelper = new THREE.ArrowHelper(direction, baseball.position, 0.5, 0xff2000);
scene.add(directionHelper);

const directionController = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 32, 16),
  new THREE.MeshToonMaterial({ color: 0xff2000 })
);
directionController.material.transparent = true;
directionController.material.opacity = 0.5;
scene.add(directionController)

const dragControls = new DragControls([directionController], camera, renderer.domElement);
dragControls.addEventListener("dragstart", e => {
  orbitControls.enabled = false;
});
dragControls.addEventListener("dragend", e => {
  orbitControls.enabled = true;
});



// ======== Rendering ========

// Set up geometry to display trajectory when finished
const pathGeometry = new THREE.BufferGeometry();
const pathMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
let pathPoints = [];
const path = new THREE.Line(pathGeometry, pathMaterial);
scene.add(path);

// Animation loop
function render() {
  requestAnimationFrame(render);

  direction.copy(directionController.position);
  direction.normalize();
  directionHelper.setDirection(direction);

  renderer.render(scene, camera);
}
render();



// ======== Physics model ========

let simulationInterval;
const dt = 16;

// Reset & begin simulation
function start() {
  clearInterval(simulationInterval);

  pathGeometry.setFromPoints([]);
  pathPoints = [];

  baseball.position.set(0, 0, 0);

  velocity.copy(direction);
  velocity.multiplyScalar(options.speed);

  simulationInterval = setInterval(step, dt);
}

// Physics model step function
function step() {
  pathPoints.push(baseball.position.clone());
  const dts = dt / 1000;

  const a_grav = new THREE.Vector3(0, -9.8, 0);
  const f_drag = velocity.clone()
    .normalize()
    .negate()
    .multiplyScalar(options.rho * velocity.lengthSq() * options.C_d * options.area / 2);
  const a_drag = f_drag.multiplyScalar(options.mass);

  velocity.addScaledVector(a_grav, dts);
  velocity.addScaledVector(a_drag, dts);
  baseball.position.addScaledVector(velocity, dts);

  orbitControls.target.copy(baseball.position);
  orbitControls.update();

  if (baseball.position.y <= 0) {
    animateEnd();
  }
}

// Transition camera to end viewpoint
function animateEnd() {
  clearInterval(simulationInterval);

  pathGeometry.setFromPoints(pathPoints);

  orbitControls.enabled = false;

  let frames = 0;
  const length = 40;
  const dist = baseball.position.length();
  const center = baseball.position.clone().multiplyScalar(0.5);
  let animationInterval = setInterval(() => {
    orbitControls.target.lerp(center, 0.1);

    camera.position.copy(orbitControls.target);
    camera.position.y = Math.max(dist, 2);
    camera.rotation.setFromVector3(new THREE.Vector3(0, -1, 1));
    orbitControls.update();

    if (++frames === length) {
      clearInterval(animationInterval);
      orbitControls.enabled = true;
    }
  }, 16);
}



// ======== GUI ========

const gui = new GUI();

const options = {
  speed: 10,
  rho: 1.2,
  C_d: 0.33,
  mass: 1.45e-3,
  area: Math.PI * (73e-3 / 2) ** 2,
  start: () => start(),
};

gui.add(options, "start");
gui.add(options, "speed").name("throw speed (m^2)");
gui.add(options, "rho").name("rho (kg/m^3)");
gui.add(options, "C_d");
gui.add(options, "mass").name("mass (kg)");
gui.add(options, "area").name("frontal area (m^2)");
gui.add(baseball.position, "x").listen().disable();
gui.add(baseball.position, "y").listen().disable();
gui.add(baseball.position, "z").listen().disable();

