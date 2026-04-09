// ported from r3f/drei

import {
    InstancedMesh,
    PlaneGeometry,
    MeshLambertMaterial,
    DynamicDrawUsage,
    Matrix4,
    Vector3,
    Quaternion,
    Color,
    InstancedBufferAttribute
} from "three";

export class CloudSystem {
    constructor({
        texture,
        limit = 200,
        material = MeshLambertMaterial
    }) {
        this.limit = limit;
        this.texture = texture;

        this.parentMatrix = new Matrix4();
        this.translation = new Vector3();
        this.rotation = new Quaternion();
        this.scale = new Vector3();

        this.cpos = new Vector3();
        this.cquat = new Quaternion();

        this.tempQ = new Quaternion();
        this.dir = new Vector3(0, 0, 1);
        this.pos = new Vector3();

        this.clouds = [];

        this.opacities = new Float32Array(limit).fill(1);
        this.colors = new Float32Array(limit * 3).fill(1);

        // geometry
        this.geometry = new PlaneGeometry(1, 1);
        this.geometry.setAttribute(
            "cloudOpacity",
            new InstancedBufferAttribute(this.opacities, 1).setUsage(DynamicDrawUsage)
        );

        // material hack (same shader trick)
        class CloudMaterial extends material {
            constructor() {
                super({ transparent: true, depthWrite: false, map: texture });

                this.onBeforeCompile = (shader) => {
                    shader.vertexShader =
                        `
                    attribute float cloudOpacity;
                    varying float vOpacity;
                    ` +
                        shader.vertexShader.replace(
                            "#include <fog_vertex>",
                            `#include <fog_vertex>
                            vOpacity = cloudOpacity;`
                        );

                    shader.fragmentShader =
                        `
                    varying float vOpacity;
                    ` +
                        shader.fragmentShader.replace(
                            "#include <output_fragment>",
                            `#include <output_fragment>
                            gl_FragColor = vec4(outgoingLight, diffuseColor.a * vOpacity);`
                        );
                };
            }
        }

        this.material = new CloudMaterial();

        this.mesh = new InstancedMesh(this.geometry, this.material, limit);
        this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
        this.mesh.instanceColor = new InstancedBufferAttribute(this.colors, 3);
        this.mesh.instanceColor.setUsage(DynamicDrawUsage);
    }

    addCloud({
        opacity = 1,
        speed = 0,
        bounds = [5, 1, 1],
        segments = 20,
        color = "#ffffff",
        fade = 10,
        volume = 6,
        smallestVolume = 0.25,
        growth = 4,
        seed = Math.random()
    }) {
        const rand = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };

        const boundsVec = new Vector3(...bounds);
        const col = new Color(color);

        for (let i = 0; i < segments; i++) {
            const cloud = {
                position: new Vector3(
                    rand() * 2 - 1,
                    rand() + 2,  // 2 .. 3
                    rand() * 2 - 1
                ).multiply(boundsVec),

                rotation: i * (Math.PI / segments),
                rotationFactor: Math.max(0.2, 0.5 * rand()) * speed,
                scale: 1,

                opacity,
                speed,
                fade,
                growth,
                volume,
                density: Math.max(0.5, rand()),

                matrix: new Matrix4(),
                color: col.clone(),
                dist: 0
            };

            this.clouds.push(cloud);
        }
    }

    update(delta, camera) {
        const t = performance.now() / 1000;

        this.mesh.updateMatrixWorld();
        this.parentMatrix.copy(this.mesh.matrixWorld).invert();

        camera.matrixWorld.decompose(this.cpos, this.cquat, this.scale);

        for (let i = 0; i < this.clouds.length; i++) {
            const c = this.clouds[i];

            this.translation.copy(c.position);

            this.rotation.copy(this.cquat).multiply(
                this.tempQ.setFromAxisAngle(
                    this.dir,
                    (c.rotation += delta * c.rotationFactor)
                )
            );

            const s =
                c.volume +
                ((1 + Math.sin(t * c.density * c.speed)) / 2) * c.growth;

            this.scale.setScalar(s);

            c.matrix
                .compose(this.translation, this.rotation, this.scale)
                .premultiply(this.parentMatrix);

            c.dist = this.translation.distanceTo(this.cpos);
        }

        // sort back to front
        this.clouds.sort((a, b) => b.dist - a.dist);

        const count = Math.min(this.limit, this.clouds.length);
        this.mesh.count = count;

        for (let i = 0; i < count; i++) {
            const c = this.clouds[i];

            this.opacities[i] =
                c.opacity * (c.dist < c.fade - 1 ? c.dist / c.fade : 1);

            this.mesh.setMatrixAt(i, c.matrix);
            this.mesh.setColorAt(i, c.color);
        }

        this.geometry.attributes.cloudOpacity.needsUpdate = true;
        this.mesh.instanceMatrix.needsUpdate = true;
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
}
