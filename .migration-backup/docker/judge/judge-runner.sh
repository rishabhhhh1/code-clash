#!/bin/bash
# Judge Runner Script
# This script compiles and runs user code, capturing output

set -e

# Function to detect language from file extension
detect_language() {
    local file="$1"
    case "$file" in
        *.cpp|*.cc|*.cxx) echo "cpp" ;;
        *.java) echo "java" ;;
        *.py) echo "python" ;;
        *.js) echo "javascript" ;;
        *) echo "unknown" ;;
    esac
}

# Function to compile C++
compile_cpp() {
    local src="$1"
    local bin="$2"
    g++ -O2 -std=c++17 -o "$bin" "$src" 2>&1
}

# Function to compile Java
compile_java() {
    local src="$1"
    local dir="$2"
    javac -d "$dir" "$src" 2>&1
}

# Main execution
if [ $# -lt 1 ]; then
    echo "Usage: judge-runner.sh <source-file>"
    exit 1
fi

SOURCE_FILE="$1"
LANGUAGE=$(detect_language "$SOURCE_FILE")

case "$LANGUAGE" in
    cpp)
        BIN_FILE="/tmp/solution"
        compile_cpp "$SOURCE_FILE" "$BIN_FILE"
        exec "$BIN_FILE"
        ;;
    java)
        DIR="/tmp/java_out"
        mkdir -p "$DIR"
        compile_java "$SOURCE_FILE" "$DIR"
        CLASS_NAME=$(basename "$SOURCE_FILE" .java)
        exec java -cp "$DIR" "$CLASS_NAME"
        ;;
    python)
        exec python3 "$SOURCE_FILE"
        ;;
    javascript)
        exec node "$SOURCE_FILE"
        ;;
    *)
        echo "Error: Unsupported language"
        exit 1
        ;;
esac
