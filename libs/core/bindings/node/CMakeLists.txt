cmake_minimum_required(VERSION 3.15)
cmake_policy(SET CMP0091 NEW)
cmake_policy(SET CMP0042 NEW)

project(terrain_erosion_native)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Include Node-API headers
execute_process(
    COMMAND node -p "require('node-addon-api').include"
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE NODE_ADDON_API_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
)
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

# Get Node.js include directory
execute_process(
    COMMAND node -p "require('node-addon-api').gyp"
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    OUTPUT_VARIABLE NODE_GYP_DIR
    OUTPUT_STRIP_TRAILING_WHITESPACE
)

# Include core TerrainSim library
set(TERRAIN_CORE_DIR ${CMAKE_SOURCE_DIR}/../..)
include_directories(
    ${NODE_ADDON_API_DIR}
    ${TERRAIN_CORE_DIR}/include
    ${CMAKE_JS_INC}
)

# Add core library sources (static compilation)
set(TERRAIN_CORE_SOURCES
    ${TERRAIN_CORE_DIR}/src/Heightmap.cpp
    ${TERRAIN_CORE_DIR}/src/PerlinNoise.cpp
    ${TERRAIN_CORE_DIR}/src/WaterParticle.cpp
    ${TERRAIN_CORE_DIR}/src/HydraulicErosion.cpp
    ${TERRAIN_CORE_DIR}/src/TerrainGenerators.cpp
)

# Build the native addon
add_library(${PROJECT_NAME} SHARED
    erosion_addon.cpp
    ${TERRAIN_CORE_SOURCES}
)

set_target_properties(${PROJECT_NAME} PROPERTIES
    PREFIX ""
    SUFFIX ".node"
    CXX_STANDARD 20
)

target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC})

# Link Node.js libraries
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})

# Definitions for Node-API
target_compile_definitions(${PROJECT_NAME} PRIVATE
    NAPI_VERSION=8
    NAPI_DISABLE_CPP_EXCEPTIONS
)
