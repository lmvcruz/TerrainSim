#include <napi.h>
#include "HydraulicErosion.hpp"
#include "Heightmap.hpp"
#include <vector>
#include <cstring>

using namespace Napi;

/**
 * @brief Simulate hydraulic erosion on a heightmap using C++ physics engine
 *
 * JavaScript API:
 * simulateErosion(heightmapArray, width, height, params)
 *
 * @param info[0] heightmapArray - Float32Array of heightmap data (row-major)
 * @param info[1] width - Number, width of heightmap
 * @param info[2] height - Number, height of heightmap
 * @param info[3] params - Object with erosion parameters
 * @returns Float32Array - Modified heightmap
 */
Value SimulateErosion(const CallbackInfo& info) {
    Env env = info.Env();

    // Validate arguments
    if (info.Length() < 4) {
        TypeError::New(env, "Expected 4 arguments: heightmap, width, height, params")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsTypedArray() || !info[1].IsNumber() || !info[2].IsNumber() || !info[3].IsObject()) {
        TypeError::New(env, "Invalid argument types")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // Extract heightmap data
    TypedArray heightmapTypedArray = info[0].As<TypedArray>();
    Float32Array heightmapArray = heightmapTypedArray.As<Float32Array>();
    size_t dataLength = heightmapArray.ElementLength();

    // Extract dimensions
    uint32_t width = info[1].As<Number>().Uint32Value();
    uint32_t height = info[2].As<Number>().Uint32Value();

    // Validate dimensions
    if (width * height != dataLength) {
        TypeError::New(env, "Heightmap size doesn't match width * height")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // Extract parameters
    Object paramsObj = info[3].As<Object>();
    terrain::HydraulicErosionParams params;

    // Parse all erosion parameters with defaults
    if (paramsObj.Has("numParticles")) {
        // numParticles is handled separately (not in HydraulicErosionParams struct)
    }
    if (paramsObj.Has("maxIterations")) {
        params.maxIterations = paramsObj.Get("maxIterations").As<Number>().Int32Value();
    }
    if (paramsObj.Has("inertia")) {
        params.inertia = paramsObj.Get("inertia").As<Number>().FloatValue();
    }
    if (paramsObj.Has("sedimentCapacityFactor")) {
        params.sedimentCapacityFactor = paramsObj.Get("sedimentCapacityFactor").As<Number>().FloatValue();
    }
    if (paramsObj.Has("minSedimentCapacity")) {
        params.minSedimentCapacity = paramsObj.Get("minSedimentCapacity").As<Number>().FloatValue();
    }
    if (paramsObj.Has("erodeSpeed")) {
        params.erodeSpeed = paramsObj.Get("erodeSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("depositSpeed")) {
        params.depositSpeed = paramsObj.Get("depositSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("evaporateSpeed")) {
        params.evaporateSpeed = paramsObj.Get("evaporateSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("gravity")) {
        params.gravity = paramsObj.Get("gravity").As<Number>().FloatValue();
    }
    if (paramsObj.Has("maxDropletSpeed")) {
        params.maxDropletSpeed = paramsObj.Get("maxDropletSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("erosionRadius")) {
        params.erosionRadius = paramsObj.Get("erosionRadius").As<Number>().Int32Value();
    }

    // Get number of particles (not in struct, used for batch simulation)
    int numParticles = 1;
    if (paramsObj.Has("numParticles")) {
        numParticles = paramsObj.Get("numParticles").As<Number>().Int32Value();
    }

    // Create C++ Heightmap object and copy data
    terrain::Heightmap heightmap(width, height);
    for (size_t i = 0; i < dataLength; ++i) {
        heightmap.data()[i] = heightmapArray[i];
    }

    // Create erosion simulator with parameters
    terrain::HydraulicErosion erosion(params);

    // Run erosion simulation
    erosion.erode(heightmap, numParticles);

    // Copy modified data back to JavaScript Float32Array
    for (size_t i = 0; i < dataLength; ++i) {
        heightmapArray[i] = heightmap.data()[i];
    }

    // Return the modified array
    return heightmapArray;
}

/**
 * @brief Simulate a single particle for frame-by-frame animation
 *
 * JavaScript API:
 * simulateParticle(heightmapArray, width, height, startX, startY, params)
 *
 * @param info[0] heightmapArray - Float32Array of heightmap data
 * @param info[1] width - Number, width of heightmap
 * @param info[2] height - Number, height of heightmap
 * @param info[3] startX - Number, particle start X position
 * @param info[4] startY - Number, particle start Y position
 * @param info[5] params - Object with erosion parameters
 * @returns Float32Array - Modified heightmap
 */
Value SimulateParticle(const CallbackInfo& info) {
    Env env = info.Env();

    // Validate arguments
    if (info.Length() < 6) {
        TypeError::New(env, "Expected 6 arguments: heightmap, width, height, startX, startY, params")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    // Extract heightmap data
    TypedArray heightmapTypedArray = info[0].As<TypedArray>();
    Float32Array heightmapArray = heightmapTypedArray.As<Float32Array>();
    size_t dataLength = heightmapArray.ElementLength();

    // Extract dimensions
    uint32_t width = info[1].As<Number>().Uint32Value();
    uint32_t height = info[2].As<Number>().Uint32Value();

    // Extract start position
    float startX = info[3].As<Number>().FloatValue();
    float startY = info[4].As<Number>().FloatValue();

    // Extract parameters
    Object paramsObj = info[5].As<Object>();
    terrain::HydraulicErosionParams params;

    // Parse parameters (same as above)
    if (paramsObj.Has("maxIterations")) {
        params.maxIterations = paramsObj.Get("maxIterations").As<Number>().Int32Value();
    }
    if (paramsObj.Has("inertia")) {
        params.inertia = paramsObj.Get("inertia").As<Number>().FloatValue();
    }
    if (paramsObj.Has("sedimentCapacityFactor")) {
        params.sedimentCapacityFactor = paramsObj.Get("sedimentCapacityFactor").As<Number>().FloatValue();
    }
    if (paramsObj.Has("minSedimentCapacity")) {
        params.minSedimentCapacity = paramsObj.Get("minSedimentCapacity").As<Number>().FloatValue();
    }
    if (paramsObj.Has("erodeSpeed")) {
        params.erodeSpeed = paramsObj.Get("erodeSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("depositSpeed")) {
        params.depositSpeed = paramsObj.Get("depositSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("evaporateSpeed")) {
        params.evaporateSpeed = paramsObj.Get("evaporateSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("gravity")) {
        params.gravity = paramsObj.Get("gravity").As<Number>().FloatValue();
    }
    if (paramsObj.Has("maxDropletSpeed")) {
        params.maxDropletSpeed = paramsObj.Get("maxDropletSpeed").As<Number>().FloatValue();
    }
    if (paramsObj.Has("erosionRadius")) {
        params.erosionRadius = paramsObj.Get("erosionRadius").As<Number>().Int32Value();
    }

    // Create C++ Heightmap object and copy data
    terrain::Heightmap heightmap(width, height);
    for (size_t i = 0; i < dataLength; ++i) {
        heightmap.data()[i] = heightmapArray[i];
    }

    // Create erosion simulator
    terrain::HydraulicErosion erosion(params);

    // Simulate single particle
    erosion.simulateParticle(heightmap, startX, startY);

    // Copy modified data back
    for (size_t i = 0; i < dataLength; ++i) {
        heightmapArray[i] = heightmap.data()[i];
    }

    return heightmapArray;
}

/**
 * @brief Get version information about the native addon
 */
Value GetVersion(const CallbackInfo& info) {
    Env env = info.Env();
    Object versionObj = Object::New(env);
    versionObj.Set("version", "1.0.0");
    versionObj.Set("erosionEngine", "C++ HydraulicErosion");
    versionObj.Set("napiVersion", "8");
    return versionObj;
}

/**
 * @brief Initialize the native addon and export functions
 */
Object Init(Env env, Object exports) {
    exports.Set("simulateErosion", Function::New(env, SimulateErosion));
    exports.Set("simulateParticle", Function::New(env, SimulateParticle));
    exports.Set("getVersion", Function::New(env, GetVersion));
    return exports;
}

NODE_API_MODULE(terrain_erosion_native, Init)
