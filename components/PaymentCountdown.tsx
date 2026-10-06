import { Timer } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { Badge } from '@/components/ui';

function format(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * "Pay within 12:34". Purely informational: the server decides when an unpaid
 * order expires. Calls onElapsed once when the time is up so the screen can
 * re-check with the server.
 */
export function PaymentCountdown({ expiresAt, onElapsed }: { expiresAt: string; onElapsed: () => void }) {
  const end = new Date(expiresAt).getTime();
  const [now, setNow] = useState(() => Date.now());
  const left = end - now;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (left <= 0) onElapsed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left <= 0]);

  if (left <= 0) return <Text className="text-sm font-medium text-amber-600">The time to pay has ended. Checking your order…</Text>;
  return <Badge label={`Pay within ${format(left)}`} tone={left < 120_000 ? 'danger' : 'warn'} icon={Timer} />;
}
