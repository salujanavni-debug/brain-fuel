import { useSearchParams } from 'react-router-dom';
import { QuickMessagesBoard } from '../components/QuickMessagesBoard';
import { QuickMessageCategoryId } from '../utils/quickMessages';

const VALID_CATEGORIES: QuickMessageCategoryId[] = [
  'basic-needs',
  'family-personal',
  'healthcare',
  'emergency',
  'custom',
];

export function QuickMessagesPage() {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get('category') as QuickMessageCategoryId | null;
  const initialCategory: QuickMessageCategoryId =
    requested && VALID_CATEGORIES.includes(requested) ? requested : 'basic-needs';

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <QuickMessagesBoard initialCategory={initialCategory} />
    </div>
  );
}
