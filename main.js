import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

// Globals
const icons = ["euro.png", "gear.png", "group.png", "package.png"];
// Setup
const scene = new THREE.Scene();

const cameraFov = 50;
const aspectRatio = window.innerWidth/window.innerHeight;
const camera = new THREE.PerspectiveCamera(cameraFov, aspectRatio, 1.0, 10.0);
camera.position.z = 7;

const canvas = document.getElementById("content");
const renderer = new THREE.WebGLRenderer({ 
	canvas: canvas,
	antialias: true,
	alpha: true,
	powerPrefrence: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enable = false;

renderer.physicallyCorrectLights = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const hdrPath = "/hdrs/charolettenbrunn_park_1k.hdr";
// const hdrPath = "/golden_gate_hills_1k.hdr";

const pmrem = new THREE.PMREMGenerator(renderer);
new RGBELoader()
	.load(hdrPath, (hdr) => {
		const envMap = pmrem.fromEquirectangular(hdr).texture;
		scene.environment = envMap;
		hdr.dispose();
		pmrem.dispose();
	});

// Scene Setup

const pyramidGroup = new THREE.Group();
const NUM_SECTIONS = 4;
const BASE_SIZE = 2;
const TOTAL_HEIGHT = BASE_SIZE*1.5;

const material = new THREE.MeshPhysicalMaterial({
	transparent: true,
	opacity: 0.4,

	transmission: 0.8,
	color: 0x2080FF,
	thickness: 1.0,
	ior: 1.31,
	depthWrite: false,
	metalness: 0.2,
	reflectivity: 0.3,
	roughness: 0.2,
	side: THREE.DoubleSide,

	attenuationColor: new THREE.Color(0x9ecbff),
	attenuationDistance: 3.0,

	clearcoat: 0.3,
	clearcoatRoughness: 0.15,
	specularIntensity: 1.0,
	specularColor: "green",

});

let moveSection = -1;
const pyramidSections = [];

for (let i = 1; i <= NUM_SECTIONS; i++) {
	const sizeFactor = BASE_SIZE/NUM_SECTIONS;
	const topSize = sizeFactor*(i-1);
	const baseSize = sizeFactor*i;
	const height = TOTAL_HEIGHT/NUM_SECTIONS;

	const geometry = new THREE.CylinderGeometry(topSize, baseSize, height, 4, 1, false).toNonIndexed();
	geometry.computeVertexNormals();
	geometry.rotateY(Math.PI/180*45);

	const sectionMesh = new THREE.Mesh(geometry, material);

	sectionMesh.position.y = -height*i;
	sectionMesh.userData.index = i;
	sectionMesh.userData.baseY = sectionMesh.position.y;
	sectionMesh.userData.state = "idle"; // "idle" | "up" | "down"
	sectionMesh.renderOrder = 0;
	pyramidSections.push(sectionMesh);
	pyramidGroup.add(sectionMesh).index;
}

const textureLoader = new THREE.TextureLoader();
for (let i = 0; i < icons.length; i++) {
	const iconPath = `/icons/${icons[i]}`;
	const iconTexture = textureLoader.load(iconPath); 
	const material = new THREE.MeshStandardMaterial({ 
		map: iconTexture,
		transparent: true,
	});

	const geometry = new THREE.PlaneGeometry(1, 1);
	const sprite = new THREE.Mesh(geometry, material);
	sprite.renderOrder = 1;
	const spriteScale = 0.4;
	sprite.scale.set(spriteScale, spriteScale, spriteScale);
	sprite.position.y = (TOTAL_HEIGHT/NUM_SECTIONS)*-(i+1.2) + (TOTAL_HEIGHT*2/3);
	scene.add(sprite);
}

pyramidGroup.position.y = TOTAL_HEIGHT*2/3;
scene.add(pyramidGroup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("mousemove", (event) => {
	mouse.x =  (event.clientX/window.innerWidth) * 2 - 1;
	mouse.y = -(event.clientY/window.innerHeight) * 2 + 1;
	raycaster.setFromCamera(mouse, camera);
	const intersects = raycaster.intersectObjects(pyramidSections);
	if (intersects.length > 0) {
		moveSection = intersects[0].object.userData.index;
		triggerCascade(moveSection);
	} else {
		moveSection = -1;
	}
})

const clock = new THREE.Clock();
let fpsAccum = 0;
let frameCount = 0;
let lastUpdateTime = clock.getElapsedTime();
const fpsStatsEl = document.getElementById("fpsStats");

function triggerCascade(moveSection) {
	if (moveSection <= 0) return;

	for (let i = 0; i < moveSection; i++) {
		const section = pyramidSections[i];
		if (section.userData.state === "idle") {
			section.userData.state = "up";
		}
	}
}

const MOVE_OFFSET = 1;
const SMOOTH = 0.08;
const EPS = 0.001;

function animate () {

	// Update FPS Stats
	const delta = clock.getDelta();
	const now = clock.getElapsedTime();
	fpsAccum += 1.0/delta;
	frameCount++;

	if (now - lastUpdateTime >= 1.0) {
		const averageFps = fpsAccum/frameCount;
		fpsStatsEl.innerText = averageFps.toFixed(0) + " FPS";
		fpsAccum = 0;
		frameCount = 0;
		lastUpdateTime = now;
	}

	// Animation Logic
	pyramidGroup.rotation.y += delta;

	pyramidSections.forEach(section => {
		const { baseY, state } = section.userData;

		let targetY = baseY;
		if (state === "up") targetY = baseY + MOVE_OFFSET;
		if (state === "down") targetY = baseY;

		section.position.y = THREE.MathUtils.lerp(
			section.position.y,
			targetY,
			SMOOTH
		);

		// State transitions
		if (
			state === "up" &&
			Math.abs(section.position.y - (baseY + MOVE_OFFSET)) < EPS
		) {
			section.userData.state = "down";
		}

		if (
			state === "down" &&
			Math.abs(section.position.y - baseY) < EPS
		) {
			section.userData.state = "idle";
		}
	});

	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

window.addEventListener("resize", () => {
	const aspectRatio = window.innerWidth/window.innerHeight;
	camera.aspect = aspectRatio;
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.updateProjectionMatrix();
});
