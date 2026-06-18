import { Suspense } from 'react';
import Pagination from './Pagination';

interface Props {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  accentColor?: string;
}

export default function PaginationWrapper(props: Props) {
  if (props.totalPages <= 1) return null;
  return (
    <Suspense fallback={<div style={{ height: 52 }} />}>
      <Pagination {...props} />
    </Suspense>
  );
}
