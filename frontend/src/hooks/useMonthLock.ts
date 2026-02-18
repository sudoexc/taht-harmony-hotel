import { useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { getMonthRange, getOverlapNights, isDateInRange } from '@/lib/format';
import { Stay } from '@/types';

export function useMonthLock() {
  const { monthClosings } = useData();
  const { isAdmin } = useAuth();

  const closedRanges = useMemo(
    () => monthClosings.map((closing) => ({ month: closing.month, ...getMonthRange(closing.month) })),
    [monthClosings]
  );

  const isDateLocked = (dateValue: string) => {
    if (isAdmin) return false;
    return closedRanges.some((range) => isDateInRange(dateValue, range.start, range.end));
  };

  const isStayLocked = (stay: Stay) => {
    if (isAdmin) return false;
    return closedRanges.some((range) =>
      getOverlapNights(range.start, range.end, stay.check_in_date, stay.check_out_date) > 0
    );
  };

  return { isDateLocked, isStayLocked };
}
