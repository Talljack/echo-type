# Import Features Comparison

## Web vs Mobile Feature Parity

### ✅ Document Category
1. **Paste Text** - ✅ Implemented
   - Title input
   - Text area for content
   - Uses `importFromText()`

2. **Upload File** - ✅ Implemented
   - PDF file picker
   - Uses `importFromPDF()`

3. **URL Import** - ✅ Implemented
   - Article URL input
   - Uses `importFromUrl()`

### ✅ Media Category
1. **URL (YouTube/Video)** - ✅ Implemented
   - YouTube/video URL input
   - Uses `importFromYouTube()`

2. **Local Media** - ✅ Implemented
   - Audio/video file picker via `expo-document-picker`
   - Transcription via `/api/import/transcribe`
   - Uses `pickAndTranscribeMedia()`

### ✅ AI Category
1. **AI Generate** - ✅ Implemented
   - Topic/prompt input
   - Difficulty selection (Beginner/Intermediate/Advanced)
   - Content Type selection (Words/Phrases/Sentences/Article)
   - Uses `generateWithAI()` with `contentType` parameter

## API Endpoints Used

### Document
- `/api/import/url` - Fetch and parse article from URL
- PDF picker uses native file system

### Media
- `/api/import/transcribe` - Transcribe audio/video files
- YouTube extraction (via backend API)

### AI
- `/api/ai/generate` - Generate content with AI
  - Parameters: `prompt`, `difficulty`, `contentType`

## Implementation Details

### Mobile-Specific Adaptations
1. **File Picking**: Uses `expo-document-picker` instead of HTML file input
2. **UI**: Two-level SegmentedButtons (main category + sub-tabs)
3. **Form Layout**: Optimized for mobile screens with proper touch targets

### Functional Equivalence
- All Web features are now available on Mobile
- Same API endpoints
- Same data structures
- Same validation logic

## Testing Checklist

- [ ] Document > Paste Text: Enter title and text, import successfully
- [ ] Document > Upload: Pick PDF file, import successfully
- [ ] Document > URL: Enter article URL, fetch and import
- [ ] Media > URL: Enter YouTube URL, extract and import
- [ ] Media > Local: Pick audio/video file, transcribe and import
- [ ] AI > Generate: Enter topic, select difficulty and type, generate content
- [ ] Error handling: Test with invalid inputs
- [ ] Loading states: Verify spinners show during async operations
- [ ] Toast notifications: Success and error messages display correctly
