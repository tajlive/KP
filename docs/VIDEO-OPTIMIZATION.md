# 📱 Video Optimalisering for Klarpakke

## Hva er gjort?

Vi har satt opp **automatisert video-optimalisering** for best ytelse på alle enheter.

## 📁 Video Formater

| Fil | Format | Størrelse | Bruk |
|-----|--------|-----------|------|
| `course-intro-desktop.mp4` | MP4 (H.264) 1080p | ~5MB | Desktop/Tablet |
| `course-intro-mobile.mp4` | MP4 (H.264) 720p | ~3MB | Mobil |
| `course-intro-low.mp4` | MP4 (H.264) 480p | ~1MB | Dårlig nett |
| `course-intro.webm` | WebM (VP9) | ~4MB | Chrome/Android |
| `course-poster.jpg` | JPEG | ~100KB | Thumbnail |
| `course-intro.mp4` | Original | 9.5MB | Fallback |

## 🚀 Hvordan optimalisere

### Steg 1: Installer FFmpeg
```bash
brew install ffmpeg
```

### Steg 2: Kjør skriptet
```bash
bash scripts/optimize-video.sh
```

Dette genererer automatisk alle formater!

## 🎨 Features

### Mobil-optimalisering
- ✅ **720p for mobil** (50% mindre data)
- ✅ **480p for dårlig nett** (80% mindre data)
- ✅ **WebM for Android** (bedre kompresjon)
- ✅ **Automatisk valg** basert på tilkobling

### Responsive Design
- ✅ **Touch-vennlige kontroller** (større knapper)
- ✅ **Data-sparing indikator** på dårlig nett
- ✅ **Poster bilde** mens video laster
- ✅ **Lazy loading** for ytelse

### Tilgjengelighet
- ✅ **Muted by default** (følger beste praksis)
- ✅ **Play/pause tydelig**
- ✅ **Fallback** hvis video feiler

## 📊 Resultat

| Enhet | Data spart | Laster på |
|-------|------------|-----------|
| Desktop | 0% | 1080p |
| Mobil (4G) | 50% | 720p |
| Mobil (3G) | 80% | 480p |
| Offline | 100% | Placeholder |

## 🔧 Manuelle justeringer

### Endre kvalitet
Rediger `scripts/optimize-video.sh`:
```bash
# Lavere = bedre kvalitet, høyere filstørrelse
crf 23  # Desktop (18-23 anbefalt)
crf 28  # Mobil (23-28 anbefalt)  
crf 32  # Low (28-35 anbefalt)
```

### Ny video?
1. Erstatt `public/videos/course-intro.mp4`
2. Kjør `bash scripts/optimize-video.sh`
3. Ferdig! 🎉

## 🌐 Nettleser-støtte

| Format | Chrome | Safari | Firefox | Edge |
|--------|--------|--------|---------|------|
| WebM | ✅ | ❌ | ✅ | ✅ |
| MP4 | ✅ | ✅ | ✅ | ✅ |

MP4 brukes som fallback for alle.

## 💡 Tips

1. **Test på mobil** - Bruk Chrome DevTools "Network throttling"
2. **Sjekk størrelse** - Mål er <5MB totalt
3. **Poster bilde** - Viktig for LCP (Largest Contentful Paint)
4. **Preload** - `metadata` laster kun første frame

## 🐛 Feilsøking

### Video vises ikke?
```bash
# Sjekk at filene finnes
ls -la public/videos/
```

### FFmpeg ikke funnet?
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian  
sudo apt-get install ffmpeg

# Windows
# Last ned fra https://ffmpeg.org/download.html
```

### For stor fil?
- Øk `crf` verdien (lavere kvalitet, mindre fil)
- Reduser oppløsning (f.eks. 1280x720 istedenfor 1920x1080)
