#!/usr/bin/env node
/**
 * Convert video to ASCII frames JSON for web playback
 * Inspired by Ghostty's video-to-terminal approach
 *
 * Usage: node scripts/video-to-ascii.mjs <input.mp4> [output.json] [cols] [fps]
 */

import { execSync, spawn } from 'child_process'
import { createCanvas, loadImage } from 'canvas'
import { writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const ASCII_CHARS = ' .·:;=+x%#@'

const inputFile = process.argv[2]
const outputFile = process.argv[3] || 'public/ascii-frames.json'
const cols = parseInt(process.argv[4]) || 80
const fps = parseInt(process.argv[5]) || 12

if (!inputFile) {
  console.log('Usage: node scripts/video-to-ascii.mjs <input.mp4> [output.json] [cols] [fps]')
  process.exit(1)
}

// Create temp directory
const workDir = join(tmpdir(), `ascii-${Date.now()}`)
mkdirSync(workDir, { recursive: true })

console.log(`Converting ${inputFile} to ASCII...`)
console.log(`Settings: ${cols} columns, ${fps} fps`)

try {
  // Extract frames with ffmpeg
  console.log('Extracting frames...')
  execSync(
    `ffmpeg -i "${inputFile}" -vf "scale=${cols}:-1:flags=lanczos" -r ${fps} "${workDir}/frame_%04d.png" -loglevel warning`,
    { stdio: 'inherit' }
  )

  // Get list of frames
  const frames = readdirSync(workDir)
    .filter(f => f.startsWith('frame_'))
    .sort()

  console.log(`Processing ${frames.length} frames...`)

  const asciiFrames = []
  const canvas = createCanvas(cols, 100) // Height will be adjusted per frame
  const ctx = canvas.getContext('2d')

  for (let i = 0; i < frames.length; i++) {
    const img = await loadImage(join(workDir, frames[i]))

    // Adjust canvas to match image
    const rows = img.height
    canvas.width = cols
    canvas.height = rows

    // Draw image
    ctx.drawImage(img, 0, 0, cols, rows)

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, cols, rows)
    const pixels = imageData.data

    // Convert to ASCII
    let ascii = ''
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4
        const r = pixels[idx]
        const g = pixels[idx + 1]
        const b = pixels[idx + 2]

        // Luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const charIdx = Math.floor((lum / 255) * (ASCII_CHARS.length - 1))
        ascii += ASCII_CHARS[charIdx]
      }
      ascii += '\n'
    }

    asciiFrames.push(ascii.trimEnd())
    process.stdout.write(`\rProcessed ${i + 1}/${frames.length}`)
  }

  console.log('\nWriting output...')

  const output = {
    fps,
    cols,
    frameCount: asciiFrames.length,
    frames: asciiFrames
  }

  writeFileSync(outputFile, JSON.stringify(output))
  console.log(`Done! Output: ${outputFile}`)
  console.log(`File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`)

} finally {
  // Cleanup
  rmSync(workDir, { recursive: true, force: true })
}
