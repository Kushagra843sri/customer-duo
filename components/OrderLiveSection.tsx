import { KeyRound, Navigation } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { getDeliveryCode, getTracking } from '@/api/customer';
import type { Tracking } from '@/api/customer';
import { Badge, Muted, SectionCard } from '@/components/ui';
import { TrackingMap } from '@/components/TrackingMap';
import { useApiResource } from '@/hooks/useApiResource';
import { FINAL_ORDER_STATUSES } from '@/lib/orderStatus';

/** Same cadence as the order screen; real-time push of positions arrives with sockets in a later milestone. */
const POLL_MS = 15_000;

function trackingMessage(t: Tracking): string {
  switch (t.status) {
    case 'assigned':
      return 'Waiting for a delivery partner to accept your order.';
    case 'accepted':
      return 'Your delivery partner is on the way to the shop.';
    case 'picked_up':
      return 'Your order is on its way to you.';
    default:
      return 'We are finding a delivery partner for your order.';
  }
}

/**
 * Live delivery tracking and the handover code for one order. Failures here
 * never break the order screen: tracking is a bonus on top of the status.
 */
export function OrderLiveSection({ orderId, status }: { orderId: string; status: string }) {
  const isFinal = FINAL_ORDER_STATUSES.includes(status);
  const tracking = useApiResource(() => (isFinal ? Promise.resolve(null) : getTracking(orderId)), [orderId, isFinal]);
  const code = useApiResource(() => (status === 'out_for_delivery' ? getDeliveryCode(orderId) : Promise.resolve(null)), [orderId, status]);

  useEffect(() => {
    if (isFinal) return;
    const timer = setInterval(tracking.retry, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFinal]);

  const t = tracking.data;
  const showMap = !!t?.available && !!t.location;

  return (
    <>
      {t && !isFinal ? (
        <SectionCard title="Delivery" icon={Navigation}>
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">{trackingMessage(t)}</Text>
          {showMap ? (
            <>
              <TrackingMap destination={t.destination ?? null} driver={t.location ?? null} />
              {t.location && !t.location.fresh ? (
                <Badge label={`Last seen ${new Date(t.location.capturedAt).toLocaleTimeString()} — may be out of date`} tone="warn" />
              ) : (
                <Muted>Live location · updates every few seconds</Muted>
              )}
            </>
          ) : null}
        </SectionCard>
      ) : null}

      {code.data ? (
        <SectionCard title="Delivery code" icon={KeyRound}>
          <View className="items-center gap-2 py-1">
            <Text className="text-4xl font-extrabold tracking-widest text-ink dark:text-ink-dark" accessibilityLabel={`Delivery code ${code.data.split('').join(' ')}`}>
              {code.data}
            </Text>
            <Muted className="text-center">Give this code to your delivery partner only when you have your order in hand.</Muted>
          </View>
        </SectionCard>
      ) : null}
    </>
  );
}
