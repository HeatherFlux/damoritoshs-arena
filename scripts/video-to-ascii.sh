#!/bin/bash
# Convert video to ASCII frames JSON using ffmpeg only
# Inspired by Ghostty's video-to-terminal approach

set -e

INPUT_FILE="$1"
OUTPUT_FILE="${2:-public/ascii-frames.json}"
COLS="${3:-80}"
FPS="${4:-12}"

if [ -z "$INPUT_FILE" ]; then
    echo "Usage: $0 <input.mp4> [output.json] [cols] [fps]"
    exit 1
fi

# ASCII chars from dark to light (12 levels) - richer character set
ASCII_CHARS=' .·:+*oø®œ#@'

# Create temp directory
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

echo "Converting $INPUT_FILE to ASCII..."
echo "Settings: ${COLS} columns, ${FPS} fps"
echo "Extracting frames..."

# Extract grayscale frames as raw pixel data (1 byte per pixel)
# Scale width to COLS, height proportionally adjusted for terminal aspect ratio
ffmpeg -i "$INPUT_FILE" \
    -vf "scale=${COLS}:-2,format=gray" \
    -r "$FPS" \
    -f rawvideo \
    -pix_fmt gray \
    "$WORK_DIR/frames.raw" \
    -loglevel warning

# Get video dimensions after scaling
DIMS=$(ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height \
    -of csv=p=0 "$INPUT_FILE" | head -1)
ORIG_WIDTH=$(echo "$DIMS" | cut -d',' -f1)
ORIG_HEIGHT=$(echo "$DIMS" | cut -d',' -f2)

# Calculate scaled height (keeping aspect ratio, adjusted for terminal)
ROWS=$(echo "scale=0; $ORIG_HEIGHT * $COLS / $ORIG_WIDTH / 2" | bc)
if [ "$ROWS" -lt 1 ]; then ROWS=1; fi

FRAME_SIZE=$((COLS * ROWS))
TOTAL_BYTES=$(wc -c < "$WORK_DIR/frames.raw" | tr -d ' ')
FRAME_COUNT=$((TOTAL_BYTES / FRAME_SIZE))

echo "Frame dimensions: ${COLS}x${ROWS}"
echo "Processing $FRAME_COUNT frames..."

# Start JSON
echo "{\"fps\":$FPS,\"cols\":$COLS,\"rows\":$ROWS,\"frameCount\":$FRAME_COUNT,\"frames\":[" > "$OUTPUT_FILE"

# Process each frame
for ((f=0; f<FRAME_COUNT; f++)); do
    OFFSET=$((f * FRAME_SIZE))

    # Extract frame bytes and convert to ASCII
    ASCII_FRAME=""
    FRAME_DATA=$(dd if="$WORK_DIR/frames.raw" bs=1 skip=$OFFSET count=$FRAME_SIZE 2>/dev/null | xxd -p | tr -d '\n')

    for ((i=0; i<${#FRAME_DATA}; i+=2)); do
        # Get hex byte and convert to decimal
        HEX_BYTE="${FRAME_DATA:$i:2}"
        GRAY=$((16#$HEX_BYTE))

        # Map 0-255 to char index 0-11
        CHAR_IDX=$((GRAY * 12 / 256))
        if [ "$CHAR_IDX" -ge 12 ]; then CHAR_IDX=11; fi

        ASCII_FRAME+="${ASCII_CHARS:$CHAR_IDX:1}"

        # Add newline at end of each row
        COL_POS=$(( (i/2 + 1) % COLS ))
        if [ "$COL_POS" -eq 0 ]; then
            ASCII_FRAME+="\n"
        fi
    done

    # Add to JSON (escape special chars)
    if [ $f -gt 0 ]; then echo "," >> "$OUTPUT_FILE"; fi
    printf '"%s"' "$ASCII_FRAME" >> "$OUTPUT_FILE"

    # Progress
    if [ $((f % 10)) -eq 0 ]; then
        echo -ne "\rProcessed $f/$FRAME_COUNT frames..."
    fi
done

echo ""
echo "]}" >> "$OUTPUT_FILE"

echo "Done! Output: $OUTPUT_FILE"
ls -lh "$OUTPUT_FILE"
