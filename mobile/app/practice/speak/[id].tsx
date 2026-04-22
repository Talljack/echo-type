import { Redirect, useLocalSearchParams } from 'expo-router';

function paramString(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value[0] ?? '';
  return '';
}

export default function SpeakContentRedirectScreen() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const contentId = paramString(id);

  return <Redirect href={{ pathname: '/practice/speak/conversation', params: { contentId } }} />;
}
