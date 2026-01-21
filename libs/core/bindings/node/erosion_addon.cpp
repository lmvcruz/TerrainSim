#include <napi.h>
#include "HydraulicErosion.hpp"
#include "Heightmap.hpp"
#include "ConfigParser.hpp"
#include "JobValidator.hpp"
#include "JobExecutor.hpp"
#include <vector>
#include <cstring>
#include <sstream>

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

    // Get absolute max elevation for progressive frame fix (optional)
    float absoluteMaxElevation = std::numeric_limits<float>::max();
    if (paramsObj.Has("absoluteMaxElevation")) {
        absoluteMaxElevation = paramsObj.Get("absoluteMaxElevation").As<Number>().FloatValue();
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

    // Run erosion simulation with optional absolute max height
    erosion.erode(heightmap, numParticles, absoluteMaxElevation);

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
    versionObj.Set("jobSystem", "C++ JobValidator + JobExecutor");
    versionObj.Set("napiVersion", "8");
    return versionObj;
}

/**
 * @brief Helper function to convert Napi::Object to JSON string
 */
std::string ObjectToJsonString(const Object& obj) {
    Env env = obj.Env();
    Object JSON = env.Global().Get("JSON").As<Object>();
    Function stringify = JSON.Get("stringify").As<Function>();
    String jsonStr = stringify.Call(JSON, { obj }).As<String>();
    return jsonStr.Utf8Value();
}

/**
 * @brief Validate pipeline configuration
 *
 * JavaScript API:
 * validateConfig(configObject)
 *
 * @param info[0] configObject - Object with pipeline configuration
 * @returns Object - { isValid, uncoveredFrames, warnings, errors }
 */
Value ValidateConfig(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        TypeError::New(env, "Expected configuration object as first argument")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        // Convert JS object to JSON string
        Object configObj = info[0].As<Object>();
        std::string jsonStr = ObjectToJsonString(configObj);

        // Parse configuration
        terrain::ConfigParser parser;
        terrain::PipelineConfig config = parser.parse(jsonStr);

        // Validate
        terrain::JobValidator validator;
        terrain::ValidationResult result = validator.validate(config);

        // Build response object
        Object response = Object::New(env);
        response.Set("isValid", Boolean::New(env, result.isValid));

        // Convert uncovered frames to array
        Array uncoveredFrames = Array::New(env, result.uncoveredFrames.size());
        for (size_t i = 0; i < result.uncoveredFrames.size(); i++) {
            uncoveredFrames.Set(i, Number::New(env, result.uncoveredFrames[i]));
        }
        response.Set("uncoveredFrames", uncoveredFrames);

        // Convert warnings to array
        Array warnings = Array::New(env, result.warnings.size());
        for (size_t i = 0; i < result.warnings.size(); i++) {
            warnings.Set(i, String::New(env, result.warnings[i]));
        }
        response.Set("warnings", warnings);

        // Convert errors to array
        Array errors = Array::New(env, result.errors.size());
        for (size_t i = 0; i < result.errors.size(); i++) {
            errors.Set(i, String::New(env, result.errors[i]));
        }
        response.Set("errors", errors);

        return response;

    } catch (const std::exception& e) {
        Error::New(env, std::string("Validation error: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * @brief Execute single frame of pipeline
 *
 * JavaScript API:
 * executeFrame(configObject, frameNumber, heightmapArray, width, height)
 *
 * @param info[0] configObject - Object with pipeline configuration
 * @param info[1] frameNumber - Number, frame to execute
 * @param info[2] heightmapArray - Float32Array of terrain data
 * @param info[3] width - Number, terrain width
 * @param info[4] height - Number, terrain height
 * @returns Float32Array - Modified terrain
 */
Value ExecuteFrame(const CallbackInfo& info) {
    Env env = info.Env();

    if (info.Length() < 5) {
        TypeError::New(env, "Expected 5 arguments: config, frameNumber, heightmap, width, height")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    if (!info[0].IsObject() || !info[1].IsNumber() || !info[2].IsTypedArray() || !info[3].IsNumber() || !info[4].IsNumber()) {
        TypeError::New(env, "Invalid argument types")
            .ThrowAsJavaScriptException();
        return env.Null();
    }

    try {
        // Parse configuration
        Object configObj = info[0].As<Object>();
        std::string jsonStr = ObjectToJsonString(configObj);
        terrain::ConfigParser parser;
        terrain::PipelineConfig config = parser.parse(jsonStr);

        // Get frame number
        int frameNumber = info[1].As<Number>().Int32Value();

        // Get heightmap data
        TypedArray typedArray = info[2].As<TypedArray>();
        Float32Array heightmapArray = typedArray.As<Float32Array>();
        float* data = heightmapArray.Data();
        size_t length = heightmapArray.ElementLength();

        // Get dimensions
        int width = info[3].As<Number>().Int32Value();
        int height = info[4].As<Number>().Int32Value();

        if (width * height != static_cast<int>(length)) {
            Error::New(env, "Heightmap size doesn't match width * height")
                .ThrowAsJavaScriptException();
            return env.Null();
        }

        // Create Heightmap from data
        terrain::Heightmap terrainMap(width, height);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                terrainMap.set(x, y, data[y * width + x]);
            }
        }

        // Execute frame using JobExecutor
        // For frame-by-frame execution, we need to run only jobs applicable to this frame
        terrain::JobExecutor executor;

        // Create a callback that will be called for the requested frame only
        bool frameExecuted = false;
        auto onFrameComplete = [&](int frame, const terrain::Heightmap& snapshot) {
            if (frame == frameNumber) {
                // Copy the snapshot back to our terrain
                for (int y = 0; y < height; y++) {
                    for (int x = 0; x < width; x++) {
                        terrainMap.set(x, y, snapshot.at(x, y));
                    }
                }
                frameExecuted = true;
            }
        };

        // Execute the pipeline up to the requested frame
        // We need to execute from frame 1 to frameNumber to maintain state
        terrain::PipelineConfig limitedConfig = config;
        limitedConfig.totalFrames = frameNumber;  // Limit execution to requested frame

        executor.execute(limitedConfig, terrainMap, onFrameComplete);

        // Copy modified terrain back to JS array
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                data[y * width + x] = terrainMap.at(x, y);
            }
        }

        // Return the modified array
        return heightmapArray;

    } catch (const std::exception& e) {
        Error::New(env, std::string("Execution error: ") + e.what())
            .ThrowAsJavaScriptException();
        return env.Null();
    }
}

/**
 * @brief Initialize the native addon and export functions
 */
Object Init(Env env, Object exports) {
    exports.Set("simulateErosion", Function::New(env, SimulateErosion));
    exports.Set("simulateParticle", Function::New(env, SimulateParticle));
    exports.Set("validateConfig", Function::New(env, ValidateConfig));
    exports.Set("executeFrame", Function::New(env, ExecuteFrame));
    exports.Set("getVersion", Function::New(env, GetVersion));
    return exports;
}

NODE_API_MODULE(terrain_erosion_native, Init)
