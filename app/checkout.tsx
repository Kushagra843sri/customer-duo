import { useRouter } from 'expo-router';
import { Banknote, CircleCheck, MapPin, Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ApiError, NetworkError } from '@/api/client';
import { listAddresses, placeOrder } from '@/api/customer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Button, Card, Divider, IconChip, InfoRow, Muted, Screen, SectionCard, useAccentSoft } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { useCart } from '@/hooks/useCart';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { formatPaise } from '@/lib/money';

function newRequestId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

function describePlaceError(error: unknown): string {
  if (error instanceof NetworkError) return 'Unable to connect. Your order was not placed — please try again.';
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many orders in a short time. Please wait a minute and try again.';
    return error.message;
  }
  return 'Something went wrong. Your order was not placed.';
}

export default function CheckoutScreen() {
  const router = useRouter();
  const soft = useAccentSoft();
  const { cart, itemCount, subtotalPaise, clear } = useCart();
  const addresses = useApiResource(listAddresses);
  useRefetchOnFocus(addresses.retry);

  const [chosen, setChosen] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const placingRef = useRef(false);
  // One id per distinct cart+address: a retry after a network drop returns the same order, never a second one.
  const attempt = useRef<{ signature: string; id: string } | null>(null);

  if (cart.lines.length === 0 || !cart.shopId) {
    return <EmptyState title="Your cart is empty" description="Add something from a shop first." icon={Banknote} />;
  }
  if (addresses.isLoading && !addresses.data) return <LoadingState />;
  if (addresses.error && !addresses.data) return <ErrorState error={addresses.error} retry={addresses.retry} />;

  const list = addresses.data ?? [];
  const selected = list.find((a) => a.addressId === chosen) ?? list.find((a) => a.isDefault) ?? list[0] ?? null;
  const shopId = cart.shopId;

  async function submit() {
    if (!selected || placingRef.current) return;
    placingRef.current = true;
    setPlacing(true);
    setError(null);

    const items = cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity }));
    const signature = JSON.stringify([shopId, selected.addressId, items]);
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: newRequestId() };

    try {
      const order = await placeOrder({ clientRequestId: attempt.current.id, shopId, addressId: selected.addressId, items });
      clear();
      router.replace({ pathname: '/order/[orderId]', params: { orderId: order.orderId } });
    } catch (err) {
      setError(describePlaceError(err));
    } finally {
      placingRef.current = false;
      setPlacing(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          {error ? <Text className="text-sm font-medium text-red-600">{error}</Text> : null}
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-ink dark:text-ink-dark">Total to pay</Text>
            <Text className="text-xl font-extrabold text-ink dark:text-ink-dark">{formatPaise(subtotalPaise)}</Text>
          </View>
          <Button label="Place order" loading={placing} disabled={!selected} onPress={submit} />
        </>
      }
    >
      <SectionCard title="Deliver to" icon={MapPin}>
        {list.length === 0 ? (
          <View className="gap-3">
            <Muted>Add a delivery address to continue.</Muted>
            <Button label="Add address" icon={Plus} onPress={() => router.push('/address-form')} />
          </View>
        ) : (
          <View className="gap-2">
            {list.map((a) => {
              const isSelected = a.addressId === selected?.addressId;
              return (
                <Pressable key={a.addressId} accessibilityRole="radio" accessibilityState={{ selected: isSelected }} onPress={() => setChosen(a.addressId)}>
                  <View
                    style={isSelected ? { borderColor: soft.fg } : undefined}
                    className="flex-row items-center gap-3 rounded-2xl border border-line p-3 dark:border-line-dark"
                  >
                    <View className="flex-1 gap-0.5">
                      <Text className="text-sm font-bold text-ink dark:text-ink-dark">{a.label}</Text>
                      <Muted>{a.fullAddress}</Muted>
                      <Muted>{a.phoneNumber}</Muted>
                    </View>
                    {isSelected ? <CircleCheck size={22} color={soft.fg} /> : null}
                  </View>
                </Pressable>
              );
            })}
            <Button variant="ghost" small label="Add another address" icon={Plus} onPress={() => router.push('/address-form')} />
          </View>
        )}
      </SectionCard>

      <SectionCard title="Payment">
        <View className="flex-row items-center gap-3">
          <IconChip icon={Banknote} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-ink dark:text-ink-dark">Cash on delivery</Text>
            <Muted>Pay the delivery partner when your order arrives.</Muted>
          </View>
        </View>
      </SectionCard>

      <SectionCard title={`Order from ${cart.shopName}`}>
        {cart.lines.map((l) => (
          <InfoRow key={l.productId} label={`${l.quantity} × ${l.name}`} value={formatPaise(l.pricePaise * l.quantity)} />
        ))}
        <Divider />
        <InfoRow label={`Items (${itemCount})`} value={formatPaise(subtotalPaise)} />
        <InfoRow label="Total" value={formatPaise(subtotalPaise)} strong />
      </SectionCard>
      <Card>
        <Muted>Prices are confirmed by our system when you place the order.</Muted>
      </Card>
    </Screen>
  );
}
