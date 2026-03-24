import * as THREE from "three";

import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import Stats from "three/examples/jsm/libs/stats.module.js";
import TWEEN from "three/examples/jsm/libs/tween.module.js";

import { Sky } from "three/examples/jsm/objects/Sky.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
//import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass }  from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
//import { RenderTransitionPass } from "three/examples/jsm/postprocessing/RenderTransitionPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

let camera, renderer;
let scene;
let gui;
let composer;
let sky, sun;
let skyMat;
let plane;
let textureAspect = 1;
let transitionPass;
let raycaster;
let activeSection = -1; // 0..3

const sections = [];
const icons = [];
const proxies = [];

const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );

const timer = new THREE.Timer();
const mouse = new THREE.Vector2();
const loader = new THREE.TextureLoader();

let pyramidGroup;
const iconPaths = ["euro.png", "gear.png", "group.png", "package.png"];

let stats;

function initSky() {

	sky = new Sky();
	sky.scale.setScalar(450000);
	scene.add(sky);

	skyMat = sky.material;

	sun = new THREE.Vector3();

	/// GUI
	const effectController = {
		turbidity: 2.6,
		rayleigh: 0.37,
		mieCoefficient: 0.01,
		mieDirectionalG: 0.95,
		elevation: 90,
		azimuth: 180,
		exposure: renderer.toneMappingExposure,
		cloudCoverage: 0.3,
		cloudDensity: 0.6,
		cloudElevation: 0.25,
		cloudScale: 0.0006,
		cloudSpeed: 0.0002,
	};

	function guiChanged() {

		const uniforms = sky.material.uniforms;
		uniforms['turbidity'].value = effectController.turbidity;
		uniforms['rayleigh'].value = effectController.rayleigh;
		uniforms['mieCoefficient'].value = effectController.mieCoefficient;
		uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

		uniforms['cloudCoverage'].value = effectController.cloudCoverage;
		uniforms['cloudDensity'].value = effectController.cloudDensity;
		uniforms['cloudElevation'].value = effectController.cloudElevation;
		uniforms['cloudScale'].value = effectController.cloudScale;
		uniforms['cloudSpeed'].value = effectController.cloudSpeed;

		const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
		const theta = THREE.MathUtils.degToRad( effectController.azimuth );

		sun.setFromSphericalCoords( 1, phi, theta );

		uniforms[ 'sunPosition' ].value.copy( sun );

		renderer.toneMappingExposure = effectController.exposure;

	}

	gui = new GUI();

	gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged);
	gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
	gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged);
	gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged);
	gui.add(effectController, 'elevation', 0, 90, 0.1).onChange(guiChanged);
	gui.add(effectController, 'azimuth', -180, 180, 0.1).onChange(guiChanged);
	gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(guiChanged);

	const folderClouds = gui.addFolder('Clouds');
	folderClouds.add(effectController, 'cloudCoverage', 0, 1, 0.01).name('coverage').onChange(guiChanged);
	folderClouds.add(effectController, 'cloudDensity', 0, 1, 0.01).name('density').onChange(guiChanged);
	folderClouds.add(effectController, 'cloudElevation', 0, 1, 0.01).name('elevation').onChange(guiChanged);
	folderClouds.add(effectController, 'cloudScale', 0, 0.0008, 0.0002).name('scale').onChange(guiChanged);
	folderClouds.add(effectController, 'cloudSpeed', 0, 0.0008, 0.0001).name('speed').onChange(guiChanged);


	guiChanged();
}

// TODO: Copy the material from the r3f version as it is.
// No need to change anything, if it works it works
function pyramidMaterial() {
	const mat = new THREE.MeshPhysicalMaterial({
		color: 0x0a2a5b,
		transparent: true,
		opacity: 0.4,
		depthWrite: false,
		side: THREE.DoubleSide,
		clearcoat: 0.5,
		metalness: 0.3,
		roughness: 0.2,
	});
	return mat;
}

async function getIcon(path) {
	const map = await loader.loadAsync(`/icons/${path}`);
	const geo = new THREE.PlaneGeometry(1, 1);
	const mat = new THREE.MeshStandardMaterial({ 
		map: map,
		transparent: true,
		depthTest: true,
		metalness: 1,
		alphaTest: 0.5,
		color: "white",
		emissive: "white",
		emissiveIntensity: 0.9,
	});
	const icon = new THREE.Mesh(geo, mat);
	icon.renderOrder = -100;
	icon.scale.setScalar(0.3);
	return icon;
}

async function setupPyramid() {

	pyramidGroup = new THREE.Group();
	scene.add(pyramidGroup);

	const numSections = 4;
	const pyramidWidth = 2;
	const pyramidHeight = pyramidWidth*1.4;
	const sectionHeight = pyramidHeight/numSections;
	const sectionWidth = pyramidWidth/numSections;

	for (let i = 0; i < numSections; i++) {
		const radiusTop = sectionWidth * i;
		const radiusBottom = sectionWidth * (i + 1);

		const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, sectionHeight, 4, 1, true).toNonIndexed();
		geo.computeVertexNormals();

		const mat = pyramidMaterial(i);
		const section = new THREE.Mesh(geo, mat);
		section.position.y = pyramidHeight - sectionHeight * i;
		section.layers.enable(BLOOM_SCENE);

		const size = radiusBottom * Math.SQRT2;
		const bottomGeo = new THREE.PlaneGeometry(size, size);
		const topSize = radiusTop * Math.SQRT2;
		const topGeo = new THREE.PlaneGeometry(topSize, topSize);

		const faceMat = new THREE.MeshStandardMaterial({
			color: 0xffffff,
			emissive: "white",
			emissiveIntensity: 1.0,
			transparent: true,
			opacity: 0.0,
			side: THREE.DoubleSide,
		});

		// bottom
		const bottom = new THREE.Mesh(bottomGeo, faceMat.clone());
		bottom.userData.isBottomFace = true;
		if (i == numSections - 1) {
			bottom.userData.isBottomFace = false;
			bottom.material = mat;
		}
		bottom.userData.sectionId = i;
		bottom.position.y = -sectionHeight / 2;
		bottom.rotation.x = -Math.PI / 2;
		bottom.rotation.z = Math.PI / 4;
		section.add(bottom);

		// top
		const top = new THREE.Mesh(topGeo, faceMat.clone());
		top.userData.isTopFace = true;
		top.userData.sectionId = i;
		top.position.y = sectionHeight / 2;
		top.rotation.x = -Math.PI / 2;
		top.rotation.z = Math.PI / 4;
		section.add(top);

		section.userData.id = i;
		section.userData.y = section.position.y;
		section.userData.t = 0;
		section.userData.targetT = 0;
		sections.push(section);

		const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
		const proxy = new THREE.Mesh(geo, proxyMat);
		proxy.position.copy(section.position);
		proxy.position.y += -pyramidHeight/2 - 0.3;
		proxy.scale.setScalar(1.2);

		proxy.userData.id = i;
		proxies.push(proxy);
		scene.add(proxy);

		const icon = await getIcon(iconPaths[i]);
		icons.push(icon);
		icon.layers.enable(BLOOM_SCENE);

		icon.position.y =  (pyramidHeight - sectionHeight * i) - pyramidHeight/2 - 0.3;
		scene.add(icon);

		// const lineGeo = new THREE.EdgesGeometry(geo);
		// const lineMat = new THREE.LineBasicMaterial({ color: "white", transparent: true, opacity: 0.2 });
		// const lines = new THREE.Line(lineGeo, lineMat);
		// section.add(lines);

		pyramidGroup.add(section);
	}

	pyramidGroup.position.y = -pyramidHeight/2 - 0.3;
}

function lighting() {
	RectAreaLightUniformsLib.init();

	const lightD = new THREE.RectAreaLight("lightblue", 2, 0.2, 20); 
	lightD.position.set(0, 0, 3);
	lightD.lookAt(0, 1, 0);
	scene.add(lightD)

	const dirLight = new THREE.DirectionalLight("purple", 1);
	dirLight.position.set(-1, 1, 0);
	dirLight.lookAt(0, 0, 0);
	scene.add(dirLight);
}

function updateGrass() {
	const vFOV = THREE.MathUtils.degToRad(camera.fov);
	const height = 2 * Math.tan(vFOV / 2) * camera.position.z;
	const width = height * camera.aspect;

	let planeWidth = width * 1.0;
	let planeHeight = planeWidth / textureAspect;

	if (planeHeight < height * 1.0) {
		planeHeight = height * 1.0;
		planeWidth = planeHeight * textureAspect;
	}
	plane.scale.set(planeWidth, planeHeight, 1);
}

async function grassPlane() {
	const grassmap = await loader.loadAsync("/grass.webp");
	grassmap.colorSpace = THREE.SRGBColorSpace;
	textureAspect = grassmap.width/grassmap.height;

	const geo = new THREE.PlaneGeometry(1, 1);
	const mat = new THREE.MeshBasicMaterial({ map: grassmap, transparent: true });
	plane = new THREE.Mesh(geo, mat);
	plane.position.y = -0.8;
	plane.position.z = -4;

	updateGrass();

	scene.add(plane);
}

const mixShader = {
	vertexShader: `
	varying vec2 vUv;

	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
	`,
	fragmentShader: `
	uniform sampler2D baseTexture;
	uniform sampler2D bloomTexture;
	uniform float bloomStrength;
	varying vec2 vUv;

	void main() {
		gl_FragColor = (texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv) * bloomStrength);
	}
	`,
};

async function init() {

	stats = new Stats();
	// stats.showPanel(1);
	document.body.appendChild(stats.dom);

	camera = new THREE.PerspectiveCamera(25, window.innerWidth/window.innerHeight, 0.1, 1000);
	camera.position.set(0, 0.8, 15);
	camera.lookAt(0, 0, 0);
	camera.zoom = 1.2;
	camera.updateProjectionMatrix();

	scene = new THREE.Scene();

	const canvas = document.getElementById("content");
	renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setAnimationLoop(animate);
	renderer.toneMapping = THREE.ReinhardToneMapping;
	renderer.toneMappingExposure = 0.4;

	initSky();

	const environment = new RoomEnvironment();
	const pmremGenerator = new THREE.PMREMGenerator(renderer);
	const envMap = pmremGenerator.fromScene(environment).texture;
	scene.environment = envMap;

	const renderPass = new RenderPass(scene, camera);

	// const params = {
	// 	threshold: 0.8,
	// 	strength: 0.7,
	// 	radius: 0.5,
	// 	exposure: 1
	// };
	//
	// const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
	// bloomPass.threshold = params.threshold;
	// bloomPass.strength = params.strength;
	// bloomPass.radius = params.radius;
	//
	// const bloomRenderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType } );
	// bloomComposer = new EffectComposer(renderer, bloomRenderTarget);
	// bloomComposer.renderToScreen = false;
	// bloomComposer.addPass(renderPass);
	// bloomComposer.addPass(bloomPass);

	// const mixPass = new ShaderPass(
	// 	new THREE.ShaderMaterial( {
	// 		uniforms: {
	// 			baseTexture: { value: null },
	// 			bloomTexture: { value: bloomComposer.renderTarget2.texture },
	// 			bloomStrength: { value: params.strength }
	// 		},
	// 		vertexShader: mixShader.vertexShader,
	// 		fragmentShader: mixShader.fragmentShader,
	// 		defines: {}
	// 	} ), 'baseTexture'
	// );
	// mixPass.needsSwap = true;

	// const outputPass = new OutputPass();

	// const finalRenderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight,
	// 	{ type: THREE.HalfFloatType, samples: 4 });

	// const transitionTexture = loader.load("/textures/transition1.png");
	// transitionPass = new RenderTransitionPass(scene, camera, sceneB, camera);
	// transitionPass.setTexture(transitionTexture);
	// transitionPass.setTransition(1);

	// final composer
	// composer = new EffectComposer(renderer, finalRenderTarget);
	// composer.addPass(renderPass);

	// composer.addPass(transitionPass);
	// composer.addPass(mixPass);
	// composer.addPass(outputPass);
	// bloomFolder.add(params, 'threshold', 0.0, 1.0).onChange(function (value) {
	// 	bloomPass.threshold = Number(value);
	// } );
	//
	// bloomFolder.add(params, 'strength', 0.0, 3).onChange(function (value) {
	// 	bloomPass.strength = Number(value);
	// 	mixPass.material.uniforms.bloomStrength.value = bloomPass.strength;
	// } );
	//
	// bloomFolder.add(params, 'radius', 0.0, 1.0).step(0.01).onChange(function (value) {
	// 	bloomPass.radius = Number(value);
	// } );

	new OrbitControls(camera, canvas);

	grassPlane();
	lighting();

	raycaster = new THREE.Raycaster();

	setupPyramid();

	window.addEventListener('resize', onWindowResize);
	window.addEventListener('mousemove', onMouseMove);
}

function onMouseMove(e) {
	mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(proxies, false);

	if (hit.length <= 0) {
		activeSection = -1;
		sections.forEach((s, i) => { 
			s.userData.targetT = 0;
			s.material.opacity = 0.4;
			if (icons[i]) icons[i].material.color = new THREE.Color("white");
		});
		return;
	}

	const newActive = hit[0].object.userData.id;
	if (activeSection === newActive) return;

	activeSection = newActive;

	sections.forEach((s, i) => {
		s.userData.targetT = i <= activeSection ? 1 : 0;
		s.material.opacity = 1;
		if (icons[activeSection]) icons[activeSection].material.color = new THREE.Color("blue");
	});
}

function updateSections(delta) {
	const speed = 6;

	sections.forEach((section) => {
		const t = section.userData.t;
		const target = section.userData.targetT;

		const newT = THREE.MathUtils.lerp(t, target, 1 - Math.exp(-speed * delta));

		section.userData.t = newT;
		section.position.y = section.userData.y + newT * 0.7;

		section.traverse(child => {
			if (child.userData.isTopFace || child.userData.isBottomFace) {
				const visible = activeSection >= 0;
				child.material.opacity = visible ? 1 : 0;
			}
		});
	});

}

function onWindowResize() {
	camera.aspect = window.innerWidth/window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
	//updateGrass();
}

function animate() {

	timer.update();
	TWEEN.update();
	const delta = timer.getDelta();

	pyramidGroup.rotation.y += delta;

	// grass
	// if (plane) {
		// 	plane.rotation.y = THREE.MathUtils.lerp(0, -THREE.MathUtils.degToRad(2), mouse.x);
		// 	plane.rotation.x = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(2), mouse.y);
		// }

	skyMat.uniforms['time'].value = performance.now() * 0.001;

	//sky.material.visible = false;
	// bloomComposer.render();
	//sky.material.visible = true;

	updateSections(delta);
	renderer.render(scene, camera);

	stats.update();
}

init();
