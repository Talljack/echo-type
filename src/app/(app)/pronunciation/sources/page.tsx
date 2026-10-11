import Link from 'next/link';
import sources from '@/lib/pronunciation-audio-sources.json';

export default function PronunciationSourcesPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6 text-slate-700">
      <Link href="/pronunciation" className="text-indigo-600">
        English sounds / 返回音标
      </Link>
      <h1 className="text-2xl font-semibold text-indigo-950">Audio sources & credits / 音频来源与署名</h1>
      <p className="text-sm leading-6">
        These are human recordings from Wikimedia Commons and Lingua Libre, licensed separately from the app. Leading
        and trailing silence was trimmed, volume normalized, and files encoded as MP3. Spoken content was retained,
        including demonstration vowels and any articles in word recordings.
      </p>
      <p className="text-sm leading-6">
        真人录音来自 Wikimedia Commons 和 Lingua Libre，音频按各自许可提供。仅处理首尾静音、音量和 MP3 编码；
        保留原有发音，包括辅音示范中的元音及例词录音中的冠词。
      </p>
      <ul className="space-y-4">
        {Object.entries(sources).map(([url, source]) => (
          <li key={url} className="rounded-xl border border-indigo-100 bg-white p-4 text-sm leading-6">
            <p className="font-semibold">{url.split('/').slice(-2).join('/')}</p>
            <p>{source.creator}</p>
            <div className="flex flex-wrap gap-x-4">
              <a
                href={source.sourcePage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline"
              >
                {source.sourceFile}
              </a>
              <a
                href={source.licenseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline"
              >
                {source.license}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
