import { useLocalSearchParams } from 'expo-router';
import { Banknote, CreditCard, MapPin, Receipt } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { ApiError } from '@/api/client';
import { cancelOrder, getOrder, verifyPayment } from '@/api/customer';
import type { Order } from '@/api/customer';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { OrderLiveSection } from '@/components/OrderLiveSection';
import { PaymentCountdown } from '@/components/PaymentCountdown';
import { Button, Divider, InfoRow, Muted, Screen, SectionCard, StatusBadge, VerticalSteps } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { confirmAlert } from '@/lib/alerts';
import { formatPaise } from '@/lib/money';
import { canCancel, describePayment, FINAL_ORDER_STATUSES, isAwaitingPayment, ORDER_STEPS } from '@/lib/orderStatus';
import { openPayment } from '@/lib/payment';

/** How often an open order screen re-checks the order (push notifications cover the rest). */
const POLL_MS = 15_000;

function stepsFor(order: Order) {
  if (order.status === 'cancelled' || order.status === 'rejected') return null;
  // An unpaid online order has not reached the shop yet.
  const current = isAwaitingPayment(order) ? -1 : ORDER_STEPS.findIndex((s) => s.status === order.status);
  return ORDER_STEPS.map((s, i) => ({ label: s.label, done: i <= current }));
}

function describeError(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function OrderScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { data, isLoading, error, retry } = useApiResource(() => getOrder(orderId), [orderId]);
  // The newest copy the server gave us from an action (cancel / payment check); a fresh fetch replaces it.
  const [latest, setLatest] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busy = useRef(false);

  /** A plain refresh: drop the action result so the fresh fetch is what we show. */
  const refresh = useCallback(() => {
    setLatest(null);
    retry();
  }, [retry]);

  const order = latest ?? data;
  const isFinal = order ? FINAL_ORDER_STATUSES.includes(order.status) : false;
  const awaiting = order ? isAwaitingPayment(order) : false;

  /** Ask the server to check with the payment provider. The app never decides an order is paid. */
  const checkPayment = useCallback(async () => {
    try {
      setLatest(await verifyPayment(orderId));
    } catch {
      refresh(); // fall back to a plain refresh; a failed check is not shown as an error
    }
  }, [orderId, refresh]);

  useEffect(() => {
    if (!order || isFinal) return;
    const timer = setInterval(() => (awaiting ? void checkPayment() : refresh()), POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.status, order?.paymentStatus, isFinal]);

  // Opened while still awaiting payment (e.g. straight after the payment page): check once now.
  useEffect(() => {
    if (!awaiting) return;
    const timer = setTimeout(() => void checkPayment(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaiting]);

  // Coming back to the app (e.g. from the payment page): check straight away.
  useEffect(() => {
    if (!awaiting) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkPayment();
    });
    return () => sub.remove();
  }, [awaiting, checkPayment]);

  if (isLoading && !order) return <LoadingState label="Loading your order…" />;
  if (error && !order) return <ErrorState error={error} retry={refresh} />;
  if (!order) return null;

  async function payNow() {
    if (busy.current) return;
    busy.current = true;
    setPaying(true);
    setActionError(null);
    try {
      await openPayment(orderId);
      await checkPayment();
    } catch (err) {
      setActionError(describeError(err, 'Could not start the payment. Please try again.'));
    } finally {
      busy.current = false;
      setPaying(false);
    }
  }

  function confirmCancel() {
    confirmAlert({
      title: 'Cancel this order?',
      message: awaiting ? 'You have not paid yet, so nothing will be charged.' : 'The shop has not accepted it yet, so you can cancel for free.',
      confirmLabel: 'Cancel order',
      destructive: true,
      onConfirm: async () => {
        if (busy.current) return;
        busy.current = true;
        setCancelling(true);
        setActionError(null);
        try {
          setLatest(await cancelOrder(orderId));
        } catch (err) {
          setActionError(describeError(err, 'Could not cancel. Please try again.'));
          refresh();
        } finally {
          busy.current = false;
          setCancelling(false);
        }
      },
    });
  }

  const steps = stepsFor(order);
  const showCancel = canCancel(order);
  const footer =
    awaiting || showCancel || actionError ? (
      <>
        {actionError ? <Text className="text-sm font-medium text-red-600">{actionError}</Text> : null}
        {awaiting && order.status === 'pending' ? (
          <Button icon={CreditCard} label={`Pay ${formatPaise(order.pricing.totalPaise)}`} loading={paying} onPress={payNow} />
        ) : null}
        {showCancel ? <Button variant={awaiting ? 'ghost' : 'danger'} label="Cancel order" loading={cancelling} onPress={confirmCancel} /> : null}
      </>
    ) : undefined;

  return (
    <Screen footer={footer}>
      <View className="gap-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">{order.shopName}</Text>
          <StatusBadge status={order.status} />
        </View>
        {order.createdAt ? <Muted>Placed {new Date(order.createdAt).toLocaleString()}</Muted> : null}
      </View>

      {awaiting && order.status === 'pending' ? (
        <SectionCard title="Payment needed" icon={CreditCard}>
          <Text className="text-sm text-ink dark:text-ink-dark">
            Your order is saved but the shop will only see it after you pay. Items are held for you meanwhile.
          </Text>
          {order.paymentExpiresAt ? <PaymentCountdown expiresAt={order.paymentExpiresAt} onElapsed={checkPayment} /> : null}
        </SectionCard>
      ) : null}

      {steps ? (
        <SectionCard title="Progress">
          <VerticalSteps steps={steps} />
        </SectionCard>
      ) : (
        <SectionCard title="Status">
          <Muted>
            {order.status === 'rejected'
              ? 'The shop could not take this order.'
              : order.paymentStatus === 'expired'
                ? 'This order was cancelled because the payment was not completed in time.'
                : 'This order was cancelled.'}
          </Muted>
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
        <Muted>{describePayment(order)}</Muted>
      </SectionCard>
    </Screen>
  );
}
