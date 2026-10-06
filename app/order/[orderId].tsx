import { useLocalSearchParams } from 'expo-router';
import { Banknote, MapPin, Receipt } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { cancelOrder, getOrder } from '@/api/customer';
import type { Order } from '@/api/customer';
import { ErrorState } from '@/components/ErrorState';
import { OrderLiveSection } from '@/components/OrderLiveSection';
import { LoadingState } from '@/components/LoadingState';
import { Button, Divider, InfoRow, Muted, Screen, SectionCard, StatusBadge, VerticalSteps } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { confirmAlert } from '@/lib/alerts';
import { formatPaise } from '@/lib/money';
import { canCancel, FINAL_ORDER_STATUSES, ORDER_STEPS } from '@/lib/orderStatus';

/** How often an open order screen re-checks the status (live push/tracking arrives in a later milestone). */
const POLL_MS = 15_000;

function stepsFor(status: string) {
  if (status === 'cancelled' || status === 'rejected') return null;
  const current = ORDER_STEPS.findIndex((s) => s.status === status);
  return ORDER_STEPS.map((s, i) => ({ label: s.label, done: i <= current }));
}

export default function OrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { data, isLoading, error, retry } = useApiResource(() => getOrder(orderId), [orderId]);
  const [override, setOverride] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = useRef(false);

  const order = override && (!data || override.status !== data.status) ? override : data;
  const isFinal = order ? FINAL_ORDER_STATUSES.includes(order.status) : false;

  useEffect(() => {
    if (!order || isFinal) return;
    const timer = setInterval(() => {
      setOverride(null);
      retry();
    }, POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, isFinal]);

  if (isLoading && !order) return <LoadingState label="Loading your order…" />;
  if (error && !order) return <ErrorState error={error} retry={retry} />;
  if (!order) return null;

  function confirmCancel() {
    confirmAlert({
      title: 'Cancel this order?',
      message: 'The shop has not accepted it yet, so you can cancel for free.',
      confirmLabel: 'Cancel order',
      destructive: true,
      onConfirm: async () => {
        if (busy.current) return;
        busy.current = true;
        setCancelling(true);
        setActionError(null);
        try {
          setOverride(await cancelOrder(orderId));
        } catch (err) {
          setActionError(err instanceof ApiError ? err.message : 'Could not cancel. Please try again.');
          retry();
        } finally {
          busy.current = false;
          setCancelling(false);
        }
      },
    });
  }

  const steps = stepsFor(order.status);

  return (
    <Screen
      footer={
        canCancel(order.status) ? (
          <>
            {actionError ? <Text className="text-sm font-medium text-red-600">{actionError}</Text> : null}
            <Button variant="danger" label="Cancel order" loading={cancelling} onPress={confirmCancel} />
          </>
        ) : actionError ? (
          <Text className="text-sm font-medium text-red-600">{actionError}</Text>
        ) : undefined
      }
    >
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">{order.shopName}</Text>
          <StatusBadge status={order.status} />
        </View>
        {order.createdAt ? <Muted>Placed {new Date(order.createdAt).toLocaleString()}</Muted> : null}
      </View>

      {steps ? (
        <SectionCard title="Progress">
          <VerticalSteps steps={steps} />
        </SectionCard>
      ) : (
        <SectionCard title="Status">
          <Muted>{order.status === 'rejected' ? 'The shop could not take this order.' : 'This order was cancelled.'}</Muted>
        </SectionCard>
      )}

      <OrderLiveSection orderId={order.orderId} status={order.status} />

      <SectionCard title="Items" icon={Receipt}>
        {order.items.map((i) => (
          <InfoRow key={i.productId} label={`${i.quantity} × ${i.name}`} value={formatPaise(i.subtotalPaise)} />
        ))}
        <Divider />
        {order.pricing.deliveryFeePaise > 0 ? <InfoRow label="Delivery fee" value={formatPaise(order.pricing.deliveryFeePaise)} /> : null}
        {order.pricing.platformFeePaise > 0 ? <InfoRow label="Platform fee" value={formatPaise(order.pricing.platformFeePaise)} /> : null}
        <InfoRow label="Total" value={formatPaise(order.pricing.totalPaise)} strong />
      </SectionCard>

      <SectionCard title="Delivery address" icon={MapPin}>
        <Text className="text-sm font-bold text-ink dark:text-ink-dark">{order.delivery.label}</Text>
        <Muted>{order.delivery.fullAddress}</Muted>
        <Muted>{order.delivery.phoneNumber}</Muted>
      </SectionCard>

      <SectionCard title="Payment" icon={Banknote}>
        <Muted>{order.paymentMethod === 'cod' ? 'Cash on delivery' : order.paymentMethod}</Muted>
      </SectionCard>
    </Screen>
  );
}
