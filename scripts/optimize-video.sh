#!/bin/bash

# ============================================
# Video Optimalisering for Klarpakke Kurs
# Krever: ffmpeg (brew install ffmpeg)
# ============================================

INPUT="public/videos/course-intro.mp4"
OUTPUT_DIR="public/videos"

echo "🎬 Klarpakke Video Optimalisering"
echo "=================================="

# Sjekk om ffmpeg er installert
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ FFmpeg ikke funnet!"
    echo "Installer med: brew install ffmpeg"
    exit 1
fi

# Sjekk om input finnes
if [ ! -f "$INPUT" ]; then
    echo "❌ Input video ikke funnet: $INPUT"
    exit 1
fi

echo "📊 Original: $(ls -lh $INPUT | awk '{print $5}')"

# ============================================
# 1. Desktop MP4 (H.264) - Høy kvalitet
# ============================================
echo ""
echo "🖥️  Genererer Desktop MP4 (H.264)..."
ffmpeg -i "$INPUT" \
    -c:v libx264 \
    -preset slow \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
    "$OUTPUT_DIR/course-intro-desktop.mp4" \
    -y 2>/dev/null

# ============================================
# 2. Mobil MP4 (H.264) - Mindre fil, 720p
# ============================================
echo "📱 Genererer Mobil MP4 (720p)..."
ffmpeg -i "$INPUT" \
    -c:v libx264 \
    -preset medium \
    -crf 28 \
    -c:a aac \
    -b:a 96k \
    -movflags +faststart \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
    "$OUTPUT_DIR/course-intro-mobile.mp4" \
    -y 2>/dev/null

# ============================================
# 3. WebM (VP9) - Best for Chrome/Android
# ============================================
echo "🌐 Genererer WebM (VP9)..."
ffmpeg -i "$INPUT" \
    -c:v libvpx-vp9 \
    -crf 30 \
    -b:v 0 \
    -c:a libopus \
    -b:a 96k \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
    "$OUTPUT_DIR/course-intro.webm" \
    -y 2>/dev/null

# ============================================
# 4. Poster bilde (første frame)
# ============================================
echo "🖼️  Genererer poster bilde..."
ffmpeg -i "$INPUT" \
    -ss 00:00:01 \
    -vframes 1 \
    -q:v 2 \
    "$OUTPUT_DIR/course-poster.jpg" \
    -y 2>/dev/null

# ============================================
# 5. Low-bandwidth versjon (480p)
# ============================================
echo "📡 Genererer Low-Bandwidth versjon (480p)..."
ffmpeg -i "$INPUT" \
    -c:v libx264 \
    -preset fast \
    -crf 32 \
    -c:a aac \
    -b:a 64k \
    -vf "scale=854:480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2" \
    "$OUTPUT_DIR/course-intro-low.mp4" \
    -y 2>/dev/null

# ============================================
# Resultat
# ============================================
echo ""
echo "✅ Ferdig! Filstørrelser:"
echo "=========================="
ls -lh $OUTPUT_DIR/course-*.{mp4,webm,jpg} 2>/dev/null | awk '{print $5, $9}'

echo ""
echo "💾 Totalt: $(du -sh $OUTPUT_DIR | awk '{print $1}')"
