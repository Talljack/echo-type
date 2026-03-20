import { splitContentBlocks } from '@/lib/content-format';
import { cn } from '@/lib/utils';

interface FormattedContentTextProps {
  text: string;
  className?: string;
  paragraphClassName?: string;
  titleClassName?: string;
  labelClassName?: string;
  quoteClassName?: string;
}

export function FormattedContentText({
  text,
  className,
  paragraphClassName,
  titleClassName,
  labelClassName,
  quoteClassName,
}: FormattedContentTextProps) {
  const blocks = splitContentBlocks(text);

  return (
    <div className={cn('space-y-4', className)}>
      {blocks.map((block) => (
        <div
          key={block.id}
          className={cn(
            'whitespace-pre-wrap',
            block.kind === 'paragraph' && paragraphClassName,
            block.kind === 'title' && titleClassName,
            block.kind === 'label' && labelClassName,
            block.kind === 'quote' && quoteClassName,
          )}
        >
          {block.text}
        </div>
      ))}
    </div>
  );
}
