import { redirect } from 'next/navigation';

export default function WordBooksPage() {
  redirect('/library?import=builtin');
}
