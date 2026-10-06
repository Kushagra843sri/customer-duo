import { useRouter } from 'expo-router';
import { MapPin, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { deleteAddress, listAddresses, updateAddress } from '@/api/customer';
import type { Address } from '@/api/customer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { Badge, Button, Card, IconButton, Muted, Screen } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';
import { confirmAlert, showAlert } from '@/lib/alerts';

export default function AddressesScreen() {
  const router = useRouter();
  const { data, isLoading, error, retry } = useApiResource(listAddresses);
  const [busyId, setBusyId] = useState<string | null>(null);
  useRefetchOnFocus(retry);

  async function run(id: string, action: () => Promise<unknown>) {
    if (busyId) return;
    setBusyId(id);
    try {
      await action();
      retry();
    } catch (err) {
      showAlert('Could not update address', err instanceof Error ? err.message : undefined);
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading && !data) return <LoadingState />;
  if (error && !data) return <ErrorState error={error} retry={retry} />;

  const list: Address[] = data ?? [];

  return (
    <Screen footer={<Button icon={Plus} label="Add address" onPress={() => router.push('/address-form')} />}>
      {list.length === 0 ? (
        <View className="h-80">
          <EmptyState title="No saved addresses" description="Add one so checkout is a single tap." icon={MapPin} />
        </View>
      ) : (
        list.map((a) => (
          <Card key={a.addressId} className="gap-3">
            <View className="flex-row items-start gap-3">
              <View className="flex-1 gap-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-bold text-ink dark:text-ink-dark">{a.label}</Text>
                  {a.isDefault ? <Badge label="Default" tone="info" /> : null}
                </View>
                <Muted>{a.fullAddress}</Muted>
                <Muted>{a.phoneNumber}</Muted>
              </View>
              <IconButton
                icon={Trash2}
                tone="danger"
                label={`Delete ${a.label}`}
                disabled={busyId !== null}
                onPress={() =>
                  confirmAlert({
                    title: 'Delete this address?',
                    message: a.label,
                    confirmLabel: 'Delete',
                    destructive: true,
                    onConfirm: () => run(a.addressId, () => deleteAddress(a.addressId)),
                  })
                }
              />
            </View>
            {!a.isDefault ? (
              <Button
                small
                variant="secondary"
                label="Make default"
                loading={busyId === a.addressId}
                onPress={() => run(a.addressId, () => updateAddress(a.addressId, { isDefault: true }))}
              />
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
