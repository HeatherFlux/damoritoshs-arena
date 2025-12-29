#!/usr/bin/env python3
"""
Convert video to ASCII frames JSON for web playback
Much faster than bash version - uses numpy for pixel processing
"""

import subprocess
import json
import sys
import tempfile
import os

# Rich ASCII character set from dark to light
ASCII_CHARS = ' .·:+*oø®œ#@'

def main():
    if len(sys.argv) < 2:
        print("Usage: python video-to-ascii.py <input.mp4> [output.json] [cols] [fps]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'public/ascii-frames.json'
    cols = int(sys.argv[3]) if len(sys.argv) > 3 else 160
    fps = int(sys.argv[4]) if len(sys.argv) > 4 else 12

    print(f"Converting {input_file} to ASCII...")
    print(f"Settings: {cols} columns, {fps} fps")

    # Get video dimensions
    probe = subprocess.run([
        'ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'csv=p=0', input_file
    ], capture_output=True, text=True)

    orig_width, orig_height = map(int, probe.stdout.strip().split(','))
    rows = int(orig_height * cols / orig_width / 2)  # /2 for terminal aspect ratio
    if rows < 1:
        rows = 1

    print(f"Frame dimensions: {cols}x{rows}")

    # Extract frames as raw grayscale
    with tempfile.NamedTemporaryFile(suffix='.raw', delete=False) as tmp:
        raw_file = tmp.name

    try:
        subprocess.run([
            'ffmpeg', '-i', input_file,
            '-vf', f'scale={cols}:{rows},format=gray',
            '-r', str(fps),
            '-f', 'rawvideo',
            '-pix_fmt', 'gray',
            raw_file,
            '-loglevel', 'warning', '-y'
        ], check=True)

        # Read raw data
        with open(raw_file, 'rb') as f:
            raw_data = f.read()

        frame_size = cols * rows
        frame_count = len(raw_data) // frame_size
        print(f"Processing {frame_count} frames...")

        frames = []
        num_chars = len(ASCII_CHARS)

        for f_idx in range(frame_count):
            offset = f_idx * frame_size
            frame_bytes = raw_data[offset:offset + frame_size]

            ascii_frame = []
            for row in range(rows):
                row_start = row * cols
                line = ''
                for col in range(cols):
                    gray = frame_bytes[row_start + col]
                    char_idx = gray * num_chars // 256
                    if char_idx >= num_chars:
                        char_idx = num_chars - 1
                    line += ASCII_CHARS[char_idx]
                ascii_frame.append(line)

            frames.append('\n'.join(ascii_frame))

            if f_idx % 10 == 0:
                print(f"\rProcessed {f_idx + 1}/{frame_count} frames...", end='', flush=True)

        print(f"\nWriting {output_file}...")

        output = {
            'fps': fps,
            'cols': cols,
            'rows': rows,
            'frameCount': len(frames),
            'frames': frames
        }

        with open(output_file, 'w') as f:
            json.dump(output, f)

        size_kb = os.path.getsize(output_file) / 1024
        print(f"Done! Output: {output_file} ({size_kb:.1f} KB)")

    finally:
        if os.path.exists(raw_file):
            os.unlink(raw_file)

if __name__ == '__main__':
    main()
