import * as THREE from "three";

//import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import TWEEN from "three/examples/jsm/libs/tween.module.js";

import { Sky } from "three/examples/jsm/objects/Sky.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
//import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
//import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
// import { RenderPass }  from "three/examples/jsm/postprocessing/RenderPass.js";
// import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
// import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
// import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
//import { RenderTransitionPass } from "three/examples/jsm/postprocessing/RenderTransitionPass.js";
// import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

let camera, renderer;
let scene;
let sky, sun;
let skyMat;
let plane;
let textureAspect = 1;
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
let pyramidGroupInternal;
const iconPaths = ["euro.png", "package.png", "gear.png", "group.png"];

const labels = [
	{ // finance
		name: "Finanzen",
		desc: "Umsatz, Kosten und Profitabilität überwachen",
		icon: "/euro.png",
		el: null, btmEl: null,
		overlayImageSrc: "finance.png"
	},
	{ // product
		name: "Produkt",
		desc: "Produktleistung, Funktionen und Qualität überwachen",
		icon: "/package.png",
		el: null, btmEl: null,
		overlayImageSrc: "product.png"
	},
	{ // internalProcess
		name: "Interne Prozesse",
		desc: "Leistungsfähigkeit und Stabilität der Arbeitsabläufe beurteilen",
		icon: "/gear.png",
		el: null, btmEl: null,
		overlayImageSrc: "internal.png"
	},
	{ // resources
		name: "Ressourcen",
		desc: "Teamkapazitäten, Tools und Infrastruktur verwalten",
		icon: "/group.png",
		el: null, btmEl: null,
		overlayImageSrc: "resource.png"
	}
];

function initSky() {

	sky = new Sky();
	sky.scale.setScalar(450000);
	scene.add(sky);

	skyMat = sky.material;
	sun = new THREE.Vector3();

	/// GUI
	const effectController = {
		turbidity: 4.4,
		rayleigh: 0.337,
		mieCoefficient: 0.045,
		mieDirectionalG: 0.79,
		elevation: 60,
		azimuth: 45,
		exposure: renderer.toneMappingExposure,
		cloudCoverage: 0.3,
		cloudDensity: 0.7,
		cloudElevation: 0.35,
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

	// gui = new GUI();
	//
	// gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(guiChanged);
	// gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
	// gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged);
	// gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(guiChanged);
	// gui.add(effectController, 'elevation', 0, 90, 0.1).onChange(guiChanged);
	// gui.add(effectController, 'azimuth', -180, 180, 0.1).onChange(guiChanged);
	// gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(guiChanged);
	//
	// const folderClouds = gui.addFolder('Clouds');
	// folderClouds.add(effectController, 'cloudCoverage', 0, 1, 0.01).name('coverage').onChange(guiChanged);
	// folderClouds.add(effectController, 'cloudDensity', 0, 1, 0.01).name('density').onChange(guiChanged);
	// folderClouds.add(effectController, 'cloudElevation', 0, 1, 0.01).name('elevation').onChange(guiChanged);
	// folderClouds.add(effectController, 'cloudScale', 0, 0.0008, 0.0002).name('scale').onChange(guiChanged);
	// folderClouds.add(effectController, 'cloudSpeed', 0, 0.0008, 0.0001).name('speed').onChange(guiChanged);

	guiChanged();
}

function hideLabels() {
	for (const label of labels) {
		if (label.el) label.el.classList.add('slide-out');
		if (label.btmEl) label.btmEl.classList.add('slide-out');
	}
}

function showLabel(labelIndex) {

	const label = labels[labelIndex];
	if (label.el) {
		label.el.classList.remove('slide-out');
		label.el.classList.add('slide-in');
	}
	if (label.btmEl) {
		label.btmEl.classList.remove('slide-out');
		label.btmEl.classList.add('slide-in');
	}
};

function setupLabels() {

	for (let i = 0; i < labels.length; i++) {
		const label = labels[i];

		// hover labels
		{
			const labelEl = document.createElement('div');
			const nameEl = document.createElement('div');
			const descEl =  document.createElement('div');

			nameEl.innerText = label.name;
			descEl.innerText = label.desc;

			descEl.classList.add('hover-label-desc');
			nameEl.classList.add('hover-label-name');
			labelEl.classList.add('hover-label');

			labelEl.style.zIndex = '100';
			labelEl.style.position = 'absolute';
			labelEl.style.top = `calc(27% + ${i*5}rem)`;
			labelEl.style.left = '54%';

			labelEl.style.opacity = '0.5';

			labelEl.appendChild(nameEl);
			labelEl.appendChild(descEl);
			document.body.appendChild(labelEl);

			label.el = labelEl;
		}

		// bottom labels
		{
			const labelEl = document.createElement('div');
			const nameEl = document.createElement('div');
			const descEl =  document.createElement('div');

			nameEl.innerText = label.name;
			descEl.innerText = label.desc;

			descEl.classList.add('bottom-label-desc');
			nameEl.classList.add('bottom-label-name');
			labelEl.classList.add('bottom-label');

			labelEl.style.zIndex = '100';
			labelEl.style.position = 'absolute';
			labelEl.style.bottom = '1rem';
			labelEl.style.left = '1rem';

			labelEl.style.opacity = '0.5';

			labelEl.appendChild(nameEl);
			labelEl.appendChild(descEl);
			document.body.appendChild(labelEl);

			label.btmEl = labelEl;
		}
	}
}

function pyramidMaterial() {
	const shader = { 
		vertexShader: `
		varying vec3 vNormal;
		varying vec3 vViewDir;
		varying vec3 vPosition;

		void main() {
			vNormal = normalMatrix * normal;
			vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
			vViewDir = normalize(-viewPos.xyz);
			vec4 worldPos = modelMatrix * vec4(position, 1.0);
			vPosition = worldPos.xyz;
			//vPosition = position;

			gl_Position = projectionMatrix * viewPos;
		}
		`,
		fragmentShader: `
		uniform bool uIsHover;
		uniform float uTime;

		varying vec3 vPosition;
		varying vec3 vNormal;
		varying vec3 vViewDir;

		void main() {
			vec3 lightBlue = vec3(0.0,0.169,0.357);

			float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewDir)), 2.0);
			float anim = sin(uTime * 2.0 + vPosition.y * 5.0) * 0.5 + 0.5;

			if (uIsHover) {
				vec3 glow = mix(lightBlue, vec3(0.2, 0.8, 1.0), fresnel * anim);
				gl_FragColor = vec4(glow, 1.0);
			} else {
				vec3 glow = mix(lightBlue, vec3(0.2, 0.8, 1.0), fresnel * anim);
				gl_FragColor = vec4(glow, 0.4);
			}
		}
		`
	};

	const mat = new THREE.ShaderMaterial({
		vertexShader: shader.vertexShader,
		fragmentShader: shader.fragmentShader,
		uniforms: {
			uIsHover: { value: false },
			uTime: { value: 0.0 },
		},
		transparent: true,
		depthWrite: false,
		// side: THREE.DoubleSide,
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
		metalness: 0,
		alphaTest: 0.5,
		color: "white",
		//emissive: "white",
		//emissiveIntensity: 0.9,
	});
	const icon = new THREE.Mesh(geo, mat);
	icon.renderOrder = 100;
	icon.scale.setScalar(0.3);
	return icon;
}

async function setupPyramid() {

	pyramidGroup = new THREE.Group();
	pyramidGroupInternal = new THREE.Group();

	const numSections = 4;
	const pyramidWidth = 2;
	const pyramidHeight = pyramidWidth*1.4;
	const sectionHeight = pyramidHeight/numSections;
	const sectionWidth = pyramidWidth/numSections;

	function createCap(size) {
		const half = size / 2;

		const geometry = new THREE.BufferGeometry();

		const vertices = new Float32Array([
			-half, 0, -half, // 0
			half, 0, -half, // 1
			half, 0,  half, // 2
			-half, 0,  half  // 3
		]);

		const indices = [
			0, 1, 2,
			0, 2, 3
		];

		geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
		geometry.setIndex(indices);

		return geometry;
	}

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

		// bottom cap
		const quadGeo = createCap(size);
		const edgesGeo = new THREE.EdgesGeometry(quadGeo, 1);
		const bottomC = new THREE.LineSegments(edgesGeo,
			new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
		);

		bottomC.position.y = -sectionHeight / 2;
		bottomC.rotation.y = Math.PI / 4;
		section.add(bottomC);

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
		pyramidGroup.add(proxy);

		const icon = await getIcon(iconPaths[i]);
		icons.push(icon);
		icon.layers.enable(BLOOM_SCENE);

		icon.position.y =  (pyramidHeight - sectionHeight * i) - pyramidHeight/2 - 0.3;
		pyramidGroup.add(icon);

		pyramidGroupInternal.add(section);
	}

	pyramidGroupInternal.position.y = -pyramidHeight/2 - 0.3;
	pyramidGroup.add(pyramidGroupInternal);

	scene.add(pyramidGroup);

	setupLabels();
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

	const f = 1.2;
	let planeWidth = width * f;
	let planeHeight = planeWidth / textureAspect;

	if (planeHeight < height * f) {
		planeHeight = height * f;
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

async function init() {

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
	//renderer.toneMappingExposure = 0.4;

	initSky();

	scene.add(new THREE.AmbientLight('white', 10));

	grassPlane();
	lighting();

	raycaster = new THREE.Raycaster();

	setupPyramid();

	window.addEventListener('resize', onWindowResize);
	window.addEventListener('mousemove', onMouseMove);
	window.addEventListener('click', onMouseClick);
}

const pyramidLeft = -4;
const pyramidBack = -3;
let offToSide = false;

function onMouseClick() {
	if (activeSection < 0)  return;
	if (labels[activeSection]) {
		showOverlay(labels[activeSection]);
	}


	const params = { t: 0, back: 0 };
	new TWEEN.Tween(params).to({ t: pyramidLeft, back: pyramidBack }).onUpdate(() => {
		pyramidGroup.position.x = params.t;
		pyramidGroup.position.z = params.back;
	}).start().onComplete(() => {
		offToSide = true;
	});
}

const overlayEl = document.getElementById('overlay');
const overlayBack = document.getElementById('overlay-back');

const helperTexts = {
	Finanzen: [
		{ text: "", x: 0, y: 0, w: 0, h: 0 },
	],

	Produkt: [
		{ text: "Leistung auf einen Blick", x: 0.06, y: 0.09, w: 0.2, h: 0.26 },
		{ text: "Zeigt Produktivität unabhängig von Herdengröße", x: 0.21, y: 0.09, w: 0.35, h: 0.26 },
		{ text: "Ideal für schnelle Trend‑Checks im Alltag", x: 0.35, y: 0.09, w: 0.49, h: 0.26 },
		{ text: "Kraftfutterkosten pro kg Milch – macht Fütterungseffizienz sofort vergleichbar", x: 0.50, y: 0.09, w: 0.64, h: 0.26 },
		{ text: "Deckungsbeitrag je Kuh nach Futterkosten – zeigt, wie wirtschaftlich die Leistung wirklich ist", x: 0.65, y: 0.09, w: 0.79, h: 0.26 },
		{ text: "Durchschnittliche Laktationsphase – liefert Kontext für Leistung, Gesundheit und Fütterungsniveau", x: 0.80, y: 0.09, w: 0.97, h: 0.26 },
		{ text: "Tagesmenge im Verlauf – zeigt sofort Leistungstrends und Ausreißer Leistung je Kuh über die Zeit – perfekt für Management‑Vergleiche und ZielsteuerungLeistung je Kuh über die Zeit – perfekt für Management‑Vergleiche und Zielsteuerung Kraftfuttereinsatz je Kuh – macht Effizienz und Kostenwirkung sichtbar", x: 0.22, y: 0.34, w: 0.78, h: 0.84 },
	],

	"Interne Prozesse": [
		{ text: "", x: 0, y: 0, w: 0, h: 0 },
	],

	Ressourcen: [
		{ text: "", x: 0, y: 0, w: 0, h: 0 },
	]

};


function setupOverlayHelper(label) {
	const helperEl = document.getElementById("overlay-helper");

	let visible = false;
	const helperText = helperTexts[label.name];
	const overlayElImg = overlayEl.children[0];

	overlayElImg.addEventListener('mousemove', (e) => {
		const rect = overlayElImg.getBoundingClientRect();

		const px = (e.clientX - rect.left) / rect.width;
		const py = (e.clientY - rect.top) / rect.height;

		let activeText = "";

		for (const zone of helperText) {
			if (
				px >= zone.x &&
				px <= zone.w &&
				py >= zone.y &&
				py <= zone.h
			) {
				activeText = zone.text;
				break;
			}
		}

		if (activeText) {
			helperEl.innerText = activeText;
			helperEl.style.opacity = "1";
			visible = true;
		} else {
			helperEl.innerText = `${px.toFixed(4)}, ${py.toFixed(4)}`;
			// helperEl.style.opacity = "0";
			// visible = false;
		}

		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		const scale = visible ? 1 : 0.95;

		const helperRect = helperEl.getBoundingClientRect();
		helperEl.style.transform = `translate(${x - helperRect.width}px, ${y - helperRect.height}px) scale(${scale})`;  
	});
}

overlayBack.addEventListener('click', () => {
	overlayEl.classList.remove('x-int');
	overlayEl.classList.add('x-out');

	const params = { t: pyramidLeft, back: pyramidBack };
	new TWEEN.Tween(params).to({ t: 0, back: 0 }).onUpdate(() => {
		pyramidGroup.position.x = params.t;
		pyramidGroup.position.z = params.back;
	}).start().onComplete(() => {
		offToSide = false;
	});
});

function showOverlay(label) {
	overlayEl.classList.remove('x-out');
	overlayEl.classList.add('x-in');
	overlayEl.children[0].src = label.overlayImageSrc;
	setupOverlayHelper(label);
}

function onMouseMove(e) {
	mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
	mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function raycasterUpdate() {

	if (offToSide) return;

	raycaster.setFromCamera(mouse, camera);
	const hit = raycaster.intersectObjects(proxies, false);

	if (hit.length <= 0) {
		activeSection = -1;
		sections.forEach((s, i) => { 
			s.userData.targetT = 0;

			// reset icons
			if (icons && icons[i]) {
				const icon = icons[i];
				icon.material.color.set('white');
				icon.scale.setScalar(0.3);
			}

		});
		hideLabels();

		for (const section of sections) {
			section.material.uniforms.uIsHover.value = false;
			section.material.depthWrite = false;
		}
		return;
	}

	const newActive = hit[0].object.userData.id;
	if (activeSection === newActive) return;

	activeSection = newActive;
	hideLabels();
	showLabel(activeSection);

	for (const section of sections) {
		section.material.uniforms.uIsHover.value = true;
		section.material.depthWrite = true;
	}

	sections.forEach((s, i) => {
		s.userData.targetT = i <= activeSection ? 1 : 0;

		// animate icons
		if (icons && icons[activeSection]) {
			const icon = icons[activeSection];
			icon.material.color.set('#002B5B');
			icon.scale.setScalar(0.4);
		}

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
	updateGrass();
}

function animate() {

	timer.update();
	TWEEN.update();
	const delta = timer.getDelta();

	raycasterUpdate();

	pyramidGroupInternal.rotation.y += delta;

	for (const section of sections) {
		section.material.uniforms.uTime.value = timer.getElapsed();
	}

	// grass
	// if (plane) {
		// 	plane.rotation.y = THREE.MathUtils.lerp(0, -THREE.MathUtils.degToRad(2), mouse.x);
		// 	plane.rotation.x = THREE.MathUtils.lerp(0, THREE.MathUtils.degToRad(2), mouse.y);
		// }

	skyMat.uniforms['time'].value = performance.now() * 0.001;

	updateSections(delta);
	renderer.render(scene, camera);
}

init();
