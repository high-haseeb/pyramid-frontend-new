export const vertShader = `
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;

void main() {
    vNormal = normalMatrix * normal;
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-viewPos.xyz);
    vPosition = position;

    gl_Position = projectionMatrix * viewPos;
}
`;

export const fragShader = `
uniform bool uHover;
uniform float uTime;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewDir;

#define LIGHT_BLUE vec3(0.0, 0.169, 0.357)

void main() {

	float fresnel = pow(1.0 - dot(normalize(vNormal), normalize(vViewDir)), 2.0);
	float anim = sin(uTime * 2.0 + vPosition.y * 5.0) * 0.5 + 0.5;

	float upFacing = dot(vNormal, vec3(0.0, 1.0, 0.0));
	float downFacing = dot(-vNormal, vec3(0.0, 1.0, 0.0)); 

	if (uHover) {
		if (upFacing > 0.7 || downFacing > 0.7) {
			gl_FragColor = vec4(1.0);
		} else {
			vec3 glow = mix(LIGHT_BLUE, vec3(0.2, 0.8, 1.0), fresnel * anim);
			gl_FragColor = vec4(glow, 1.0);
		}
	} else {
		if (upFacing > 0.7 || downFacing > 0.7) discard;
		vec3 glow = mix(LIGHT_BLUE, vec3(0.2, 0.8, 1.0), fresnel * anim);
		gl_FragColor = vec4(glow, 0.4);
	}
}
`;
