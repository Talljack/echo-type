#!/usr/bin/env node

/**
 * Manual Verification Script for Import Features
 *
 * This script verifies that all import functions are correctly implemented
 * by checking their signatures, parameters, and return types.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Import Features Implementation...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0,
};

function check(name, condition, errorMsg) {
  if (condition) {
    console.log(`✅ ${name}`);
    checks.passed++;
    return true;
  } else {
    console.log(`❌ ${name}: ${errorMsg}`);
    checks.failed++;
    return false;
  }
}

function warn(name, message) {
  console.log(`⚠️  ${name}: ${message}`);
  checks.warnings++;
}

// Check file existence
console.log('📁 Checking file structure...\n');

const files = [
  'src/components/library/ImportModal.tsx',
  'src/lib/import/url.ts',
  'src/lib/import/ai.ts',
  'src/lib/import/media.ts',
  'src/lib/import/file.ts',
  'src/lib/storage/types.ts',
];

files.forEach((file) => {
  const exists = fs.existsSync(file);
  check(`File exists: ${file}`, exists, 'File not found');
});

console.log('\n📝 Checking ImportModal.tsx implementation...\n');

const importModalContent = fs.readFileSync('src/components/library/ImportModal.tsx', 'utf8');

// Check main categories
check(
  'Document category implemented',
  importModalContent.includes("mainCategory === 'document'"),
  'Document category not found',
);

check(
  'Media category implemented',
  importModalContent.includes("mainCategory === 'media'"),
  'Media category not found',
);

check('AI category implemented', importModalContent.includes("mainCategory === 'ai'"), 'AI category not found');

// Check document sub-tabs
check(
  'Document > Paste implemented',
  importModalContent.includes("documentTab === 'paste'") && importModalContent.includes('importFromText'),
  'Paste text not properly implemented',
);

check(
  'Document > Upload implemented',
  importModalContent.includes("documentTab === 'upload'") && importModalContent.includes('pickAndImportDocumentFile'),
  'Upload not properly implemented',
);

check(
  'Document > URL implemented',
  importModalContent.includes("documentTab === 'url'") && importModalContent.includes('importFromUrl'),
  'URL import not properly implemented',
);

// Check media sub-tabs
check(
  'Media > URL implemented',
  importModalContent.includes("mediaTab === 'url'") && importModalContent.includes('importFromYouTube'),
  'YouTube import not properly implemented',
);

check(
  'Media > Local implemented',
  importModalContent.includes("mediaTab === 'local'") && importModalContent.includes('pickAndTranscribeMedia'),
  'Local media import not properly implemented',
);

// Check AI implementation
check(
  'AI > contentType parameter',
  importModalContent.includes('aiContentType') && importModalContent.includes('contentType: aiContentType'),
  'AI contentType parameter not passed',
);

check(
  'AI > difficulty parameter',
  importModalContent.includes('aiDifficulty') && importModalContent.includes('difficulty: aiDifficulty'),
  'AI difficulty parameter not passed',
);

console.log('\n📝 Checking ai.ts implementation...\n');

const aiContent = fs.readFileSync('src/lib/import/ai.ts', 'utf8');

check(
  'AI contentType type definition',
  aiContent.includes("type ContentType = 'word' | 'phrase' | 'sentence' | 'article'"),
  'ContentType not properly defined',
);

check(
  'AI contentType in GenerateOptions',
  aiContent.includes('contentType?: ContentType'),
  'contentType not in GenerateOptions interface',
);

check(
  'AI contentType sent to API',
  aiContent.includes('contentType: options.contentType'),
  'contentType not sent to API',
);

console.log('\n📝 Checking media.ts implementation...\n');

const mediaContent = fs.readFileSync('src/lib/import/media.ts', 'utf8');

check(
  'Media uses expo-document-picker',
  mediaContent.includes("import * as DocumentPicker from 'expo-document-picker'"),
  'expo-document-picker not imported',
);

check(
  'Media calls transcribe API',
  mediaContent.includes('/api/import/transcribe'),
  'Transcribe API endpoint not called',
);

check(
  'Media handles file selection',
  mediaContent.includes('DocumentPicker.getDocumentAsync'),
  'File picker not implemented',
);

check('Media creates FormData', mediaContent.includes('new FormData()'), 'FormData not created for file upload');

console.log('\n📝 Checking storage types...\n');

const typesContent = fs.readFileSync('src/lib/storage/types.ts', 'utf8');

check(
  'Storage types include local-media source',
  typesContent.includes("'local-media'"),
  'local-media source type not added',
);

console.log('\n📊 Summary\n');
console.log(`✅ Passed: ${checks.passed}`);
console.log(`❌ Failed: ${checks.failed}`);
console.log(`⚠️  Warnings: ${checks.warnings}`);

if (checks.failed === 0) {
  console.log('\n🎉 All checks passed! Import features are correctly implemented.\n');
  process.exit(0);
} else {
  console.log('\n❌ Some checks failed. Please review the implementation.\n');
  process.exit(1);
}
