/**
 * @file WebGPU camera utilities for WGSL shaders
 * Provides camera functions and perspective calculations for 3D rendering
 */

import { width, height } from './canvas.js';

/**
 * Generates camera-related WGSL code
 * @param {Object} [options] - Camera configuration options
 * @param {number} [options.cameraDistance=250.0] - Base distance of camera from origin
 * @param {number} [options.rotationSpeed=0.01] - Camera rotation speed
 * @param {number} [options.fieldOfView=90.0] - Camera field of view in degrees
 * @param {number} [options.nearPlane=1.0] - Near clipping plane distance
 * @param {number} [options.farPlane=1000.0] - Far clipping plane distance
 * @param {number} [options.cameraY=-100.0] - Camera Y position
 * @returns {string} WGSL camera code
 */
export function getCamStuff(options = {}) {
    const {
        cameraDistance = 250.0,
        rotationSpeed = 0.01,
        fieldOfView = 90.0,
        nearPlane = 1.0,
        farPlane = 1000.0,
        cameraY = -100.0
    } = options;

    return `
    // Camera configuration constants
    const BASE_CAMERA_DISTANCE = ${cameraDistance};
    const ROTATION_SPEED = ${rotationSpeed};            // Adjust this to change rotation speed
    const FIELD_OF_VIEW = ${fieldOfView};
    const ASPECT_RATIO = ${width / height};
    const NEAR_PLANE = ${nearPlane};
    const FAR_PLANE = ${farPlane};
    const CAMERA_UP = vec3 < f32 > (0.0, 1.0, 0.0);

    // Orthographic parameters
    const ORTHO_SIZE = 5.0;               // Size of the orthographic view (height)
    const ORTHO_WIDTH = ORTHO_SIZE * ASPECT_RATIO;
    const ORTHO_HEIGHT = ORTHO_SIZE;

    fn calculateCameraPosition() -> vec3 < f32 > {
        let angle = globalData[0].frame * ROTATION_SPEED;
        return vec3 < f32 > (
            cos(angle) * BASE_CAMERA_DISTANCE,
            ${cameraY},
            sin(angle) * BASE_CAMERA_DISTANCE
        );
    }

    fn lookAt(eye: vec3 < f32 >, targetDir: vec3 < f32 >, up: vec3 < f32 >) -> mat4x4 < f32 > {
        let f = normalize(targetDir - eye);
        let s = normalize(cross(f, up));
        let u = cross(s, f);

        return mat4x4 < f32 > (
            vec4 < f32 > (s.x, u.x, -f.x, 0.0),
            vec4 < f32 > (s.y, u.y, -f.y, 0.0),
            vec4 < f32 > (s.z, u.z, -f.z, 0.0),
            vec4 < f32 > (-dot(s, eye), -dot(u, eye), dot(f, eye), 1.0)
        );
    }

    fn perspectiveMatrix() -> mat4x4 < f32 > {
        let fovRad = radians(FIELD_OF_VIEW);
        let f = 1.0 / tan(fovRad / 2.0);

        return mat4x4 < f32 > (
            vec4 < f32 > (f / ASPECT_RATIO, 0.0, 0.0, 0.0),
            vec4 < f32 > (0.0, f, 0.0, 0.0),
            vec4 < f32 > (0.0, 0.0, (FAR_PLANE + NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), -1.0),
            vec4 < f32 > (0.0, 0.0, (2.0 * FAR_PLANE * NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), 0.0)
        );
    }

    fn worldToScreenPerspective(worldPos: vec3 < f32 >) -> vec2 < f32 > {
        let cameraPos = calculateCameraPosition();
        let viewMatrix = lookAt(cameraPos, vec3 < f32 > (0.0, 0.0, 0.0), CAMERA_UP);
        let projMatrix = perspectiveMatrix();
        let viewProj = projMatrix * viewMatrix;

        // Transform to clip space
        let clipPos = viewProj * vec4 < f32 > (worldPos, 1.0);

        // Perspective division
        let ndcPos = clipPos.xyz / clipPos.w;

        // Convert to screen coordinates [0,1]
        return vec2 < f32 > (
            (ndcPos.x + 1.0) * 0.5,
            (ndcPos.y + 1.0) * 0.5
        );
    }
    `;
}

/**
 * Creates a static camera at a specific position
 * @param {Object} position - Camera position
 * @param {number} position.x - X coordinate
 * @param {number} position.y - Y coordinate
 * @param {number} position.z - Z coordinate
 * @param {Object} [target] - Camera target position (default: origin)
 * @param {number} [target.x=0] - Target X coordinate
 * @param {number} [target.y=0] - Target Y coordinate
 * @param {number} [target.z=0] - Target Z coordinate
 * @returns {string} WGSL code for a static camera
 */
export function createStaticCamera(position, target = { x: 0, y: 0, z: 0 }) {
    if (!position || typeof position !== 'object' || 
        typeof position.x !== 'number' || 
        typeof position.y !== 'number' || 
        typeof position.z !== 'number') {
        throw new Error('createStaticCamera: Valid position object with x, y, z coordinates is required');
    }

    return `
    // Static camera configuration constants
    const FIELD_OF_VIEW = 90.0;
    const ASPECT_RATIO = ${width / height};
    const NEAR_PLANE = 1.0;
    const FAR_PLANE = 1000.0;
    const CAMERA_UP = vec3 < f32 > (0.0, 1.0, 0.0);
    
    const CAMERA_POSITION = vec3<f32>(${position.x}, ${position.y}, ${position.z});
    const CAMERA_TARGET = vec3<f32>(${target.x}, ${target.y}, ${target.z});

    fn calculateCameraPosition() -> vec3 < f32 > {
        return CAMERA_POSITION;
    }

    fn lookAt(eye: vec3 < f32 >, targetDir: vec3 < f32 >, up: vec3 < f32 >) -> mat4x4 < f32 > {
        let f = normalize(targetDir - eye);
        let s = normalize(cross(f, up));
        let u = cross(s, f);

        return mat4x4 < f32 > (
            vec4 < f32 > (s.x, u.x, -f.x, 0.0),
            vec4 < f32 > (s.y, u.y, -f.y, 0.0),
            vec4 < f32 > (s.z, u.z, -f.z, 0.0),
            vec4 < f32 > (-dot(s, eye), -dot(u, eye), dot(f, eye), 1.0)
        );
    }

    fn perspectiveMatrix() -> mat4x4 < f32 > {
        let fovRad = radians(FIELD_OF_VIEW);
        let f = 1.0 / tan(fovRad / 2.0);

        return mat4x4 < f32 > (
            vec4 < f32 > (f / ASPECT_RATIO, 0.0, 0.0, 0.0),
            vec4 < f32 > (0.0, f, 0.0, 0.0),
            vec4 < f32 > (0.0, 0.0, (FAR_PLANE + NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), -1.0),
            vec4 < f32 > (0.0, 0.0, (2.0 * FAR_PLANE * NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), 0.0)
        );
    }

    fn worldToScreenPerspective(worldPos: vec3 < f32 >) -> vec2 < f32 > {
        let cameraPos = calculateCameraPosition();
        let viewMatrix = lookAt(cameraPos, CAMERA_TARGET, CAMERA_UP);
        let projMatrix = perspectiveMatrix();
        let viewProj = projMatrix * viewMatrix;

        // Transform to clip space
        let clipPos = viewProj * vec4 < f32 > (worldPos, 1.0);

        // Perspective division
        let ndcPos = clipPos.xyz / clipPos.w;

        // Convert to screen coordinates [0,1]
        return vec2 < f32 > (
            (ndcPos.x + 1.0) * 0.5,
            (ndcPos.y + 1.0) * 0.5
        );
    }
    `;
}

/**
 * Creates a first-person camera controller WGSL code
 * @param {Object} [options] - First-person camera options
 * @param {Object} [options.initialPosition={ x: 0, y: 2, z: 5 }] - Starting position
 * @param {Object} [options.initialLookAt={ x: 0, y: 0, z: 0 }] - Initial look target
 * @param {number} [options.moveSpeed=0.1] - Camera movement speed
 * @param {number} [options.sensitivity=0.003] - Mouse look sensitivity
 * @returns {string} WGSL first-person camera code
 */
export function createFirstPersonCamera(options = {}) {
    const {
        initialPosition = { x: 0, y: 2, z: 5 },
        initialLookAt = { x: 0, y: 0, z: 0 },
        moveSpeed = 0.1,
        sensitivity = 0.003
    } = options;
    
    return `
    // First-person camera constants
    const CAMERA_MOVE_SPEED = ${moveSpeed};
    const MOUSE_SENSITIVITY = ${sensitivity};
    const FIELD_OF_VIEW = 70.0;
    const ASPECT_RATIO = ${width / height};
    const NEAR_PLANE = 0.1;
    const FAR_PLANE = 1000.0;
    const CAMERA_UP = vec3<f32>(0.0, 1.0, 0.0);
    
    // Camera state (should be fed from uniform buffer in real implementation)
    var<private> camera_position = vec3<f32>(${initialPosition.x}, ${initialPosition.y}, ${initialPosition.z});
    var<private> camera_front = normalize(vec3<f32>(${initialLookAt.x - initialPosition.x}, 
                                                   ${initialLookAt.y - initialPosition.y},
                                                   ${initialLookAt.z - initialPosition.z}));
    var<private> camera_right = normalize(cross(camera_front, CAMERA_UP));
    var<private> camera_up = normalize(cross(camera_right, camera_front));
    var<private> yaw = -90.0; // Default is looking along negative z
    var<private> pitch = 0.0;
    
    fn updateCameraVectors() {
        let direction = vec3<f32>(
            cos(radians(yaw)) * cos(radians(pitch)),
            sin(radians(pitch)),
            sin(radians(yaw)) * cos(radians(pitch))
        );
        
        camera_front = normalize(direction);
        camera_right = normalize(cross(camera_front, CAMERA_UP));
        camera_up = normalize(cross(camera_right, camera_front));
    }
    
    fn moveCamera(direction: i32) {
        switch direction {
            case 0: { // Forward
                camera_position += CAMERA_MOVE_SPEED * camera_front;
            }
            case 1: { // Backward
                camera_position -= CAMERA_MOVE_SPEED * camera_front;
            }
            case 2: { // Left
                camera_position -= CAMERA_MOVE_SPEED * camera_right;
            }
            case 3: { // Right
                camera_position += CAMERA_MOVE_SPEED * camera_right;
            }
            case 4: { // Up
                camera_position += CAMERA_MOVE_SPEED * CAMERA_UP;
            }
            case 5: { // Down
                camera_position -= CAMERA_MOVE_SPEED * CAMERA_UP;
            }
            default: {}
        }
    }
    
    fn rotateCamera(xoffset: f32, yoffset: f32) {
        yaw += xoffset * MOUSE_SENSITIVITY;
        pitch += yoffset * MOUSE_SENSITIVITY;
        
        // Constrain pitch
        pitch = clamp(pitch, -89.0, 89.0);
        
        updateCameraVectors();
    }
    
    fn getViewMatrix() -> mat4x4<f32> {
        let target = camera_position + camera_front;
        return lookAt(camera_position, target, camera_up);
    }
    
    fn lookAt(eye: vec3<f32>, target: vec3<f32>, up: vec3<f32>) -> mat4x4<f32> {
        let f = normalize(target - eye);
        let r = normalize(cross(f, up));
        let u = cross(r, f);
        
        return mat4x4<f32>(
            vec4<f32>(r.x, u.x, -f.x, 0.0),
            vec4<f32>(r.y, u.y, -f.y, 0.0),
            vec4<f32>(r.z, u.z, -f.z, 0.0),
            vec4<f32>(-dot(r, eye), -dot(u, eye), dot(f, eye), 1.0)
        );
    }
    
    fn perspectiveMatrix() -> mat4x4<f32> {
        let fovRad = radians(FIELD_OF_VIEW);
        let f = 1.0 / tan(fovRad / 2.0);
        
        return mat4x4<f32>(
            vec4<f32>(f / ASPECT_RATIO, 0.0, 0.0, 0.0),
            vec4<f32>(0.0, f, 0.0, 0.0),
            vec4<f32>(0.0, 0.0, (FAR_PLANE + NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), -1.0),
            vec4<f32>(0.0, 0.0, (2.0 * FAR_PLANE * NEAR_PLANE) / (NEAR_PLANE - FAR_PLANE), 0.0)
        );
    }
    
    fn worldToScreenPerspective(worldPos: vec3<f32>) -> vec2<f32> {
        let viewMatrix = getViewMatrix();
        let projMatrix = perspectiveMatrix();
        let viewProj = projMatrix * viewMatrix;
        
        // Transform to clip space
        let clipPos = viewProj * vec4<f32>(worldPos, 1.0);
        
        // Perspective division
        let ndcPos = clipPos.xyz / clipPos.w;
        
        // Convert to screen coordinates [0,1]
        return vec2<f32>(
            (ndcPos.x + 1.0) * 0.5,
            (ndcPos.y + 1.0) * 0.5
        );
    }
    `;
}

export default {
    getCamStuff,
    createStaticCamera,
    createFirstPersonCamera
};
