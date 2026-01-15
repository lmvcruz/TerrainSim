#include <napi.h>
#include "../../include/ConfigParser.hpp"
#include "../../include/JobValidator.hpp"
#include "../../include/JobExecutor.hpp"
#include <sstream>

using namespace TerrainSim;

// Helper: Convert Napi::Object to JSON string
std::string ObjectToJsonString(const Napi::Object& obj) {
    Napi::Env env = obj.Env();
    Napi::Object JSON = env.Global().Get("JSON").As<Napi::Object>();
    Napi::Function stringify = JSON.Get("stringify").As<Napi::Function>();
    Napi::String jsonStr = stringify.Call(JSON, { obj }).As<Napi::String>();
    return jsonStr.Utf8Value();
}

// API-007: Validate pipeline configuration
Napi::Object ValidateConfig(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Expected configuration object as first argument")
            .ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }

    try {
        // Convert JS object to JSON string
        Napi::Object configObj = info[0].As<Napi::Object>();
        std::string jsonStr = ObjectToJsonString(configObj);

        // Parse configuration
        ConfigParser parser;
        PipelineConfig config = parser.parse(jsonStr);

        // Validate
        JobValidator validator;
        ValidationResult result = validator.validate(config);

        // Build response object
        Napi::Object response = Napi::Object::New(env);
        response.Set("isValid", Napi::Boolean::New(env, result.isValid));

        // Convert uncovered frames to array
        Napi::Array uncoveredFrames = Napi::Array::New(env, result.uncoveredFrames.size());
        for (size_t i = 0; i < result.uncoveredFrames.size(); i++) {
            uncoveredFrames.Set(i, Napi::Number::New(env, result.uncoveredFrames[i]));
        }
        response.Set("uncoveredFrames", uncoveredFrames);

        // Convert warnings to array
        Napi::Array warnings = Napi::Array::New(env, result.warnings.size());
        for (size_t i = 0; i < result.warnings.size(); i++) {
            warnings.Set(i, Napi::String::New(env, result.warnings[i]));
        }
        response.Set("warnings", warnings);

        // Convert errors to array
        Napi::Array errors = Napi::Array::New(env, result.errors.size());
        for (size_t i = 0; i < result.errors.size(); i++) {
            errors.Set(i, Napi::String::New(env, result.errors[i]));
        }
        response.Set("errors", errors);

        return response;

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Validation error: ") + e.what())
            .ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }
}

// Execute single frame of pipeline
Napi::Object ExecuteFrame(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected 3 arguments: config, frameNumber, heightmap")
            .ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }

    if (!info[0].IsObject() || !info[1].IsNumber() || !info[2].IsTypedArray()) {
        Napi::TypeError::New(env, "Invalid argument types")
            .ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }

    try {
        // Parse configuration
        Napi::Object configObj = info[0].As<Napi::Object>();
        std::string jsonStr = ObjectToJsonString(configObj);
        ConfigParser parser;
        PipelineConfig config = parser.parse(jsonStr);

        // Get frame number
        int frameNumber = info[1].As<Napi::Number>().Int32Value();

        // Get heightmap data
        Napi::TypedArray typedArray = info[2].As<Napi::TypedArray>();
        Napi::Float32Array heightmapArray = typedArray.As<Napi::Float32Array>();
        float* data = heightmapArray.Data();
        size_t length = heightmapArray.ElementLength();

        // Determine grid dimensions (assume square)
        int width = static_cast<int>(std::sqrt(length));
        int height = width;

        if (width * height != static_cast<int>(length)) {
            Napi::Error::New(env, "Heightmap must be square")
                .ThrowAsJavaScriptException();
            return Napi::Object::New(env);
        }

        // Create Heightmap from data
        Heightmap terrain(width, height);
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                terrain.set(x, y, data[y * width + x]);
            }
        }

        // Execute frame
        JobExecutor executor(config);
        executor.executeFrame(frameNumber, terrain);

        // Copy modified terrain back to JS array
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                data[y * width + x] = terrain.at(x, y);
            }
        }

        // Return success indicator
        Napi::Object result = Napi::Object::New(env);
        result.Set("success", Napi::Boolean::New(env, true));
        result.Set("frame", Napi::Number::New(env, frameNumber));

        return result;

    } catch (const std::exception& e) {
        Napi::Error::New(env, std::string("Execution error: ") + e.what())
            .ThrowAsJavaScriptException();
        return Napi::Object::New(env);
    }
}

// Initialize the binding
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("validateConfig", Napi::Function::New(env, ValidateConfig));
    exports.Set("executeFrame", Napi::Function::New(env, ExecuteFrame));
    return exports;
}

NODE_API_MODULE(job_system, Init)
