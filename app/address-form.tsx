import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { LocateFixed } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { createAddress } from '@/api/customer';
import { Button, Muted, usePalette } from '@/components/ui';

const PHONE = /^\+?\d{10,13}$/;

function formatPlace(p: Location.LocationGeocodedAddress): string {
  return [p.name, p.street, p.district, p.city, p.region, p.postalCode].filter((x): x is string => !!x && x.length > 0).join(', ');
}

export default function AddressFormScreen() {
  const router = useRouter();
  const palette = usePalette();
  const [label, setLabel] = useState('Home');
  const [fullAddress, setFullAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const savingRef = useRef(false);

  async function useMyLocation() {
    setLocating(true);
    setError(null);
    setHint(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location permission was denied. You can type the address instead.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(point);
      try {
        const [place] = await Location.reverseGeocodeAsync(point);
        const text = place ? formatPlace(place) : '';
        if (text) setFullAddress(text);
        setHint(text ? 'Location added. Please add your flat / house number to the address.' : 'Location saved. Please type your address.');
      } catch {
        setHint('Location saved. Please type your address.');
      }
    } catch {
      setError('Could not get your location. You can type the address instead.');
    } finally {
      setLocating(false);
    }
  }

  async function save() {
    if (savingRef.current) return;
    const addressText = fullAddress.trim();
    const phoneText = phone.trim();
    if (label.trim().length === 0) return setError('Give this address a name, e.g. Home.');
    if (addressText.length < 5) return setError('Enter the full delivery address.');
    if (!PHONE.test(phoneText)) return setError('Enter a phone number with 10–13 digits.');

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      await createAddress({
        label: label.trim(),
        fullAddress: addressText,
        phoneNumber: phoneText,
        isDefault,
        ...(coords ?? {}),
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the address.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const input =
    'rounded-2xl border border-line bg-surface px-4 text-base text-ink dark:border-line-dark dark:bg-surface-dark dark:text-ink-dark';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-canvas dark:bg-canvas-dark">
      <ScrollView contentContainerClassName="gap-4 p-4 pb-10" keyboardShouldPersistTaps="handled">
        <Button variant="secondary" icon={LocateFixed} label="Use my current location" loading={locating} onPress={useMyLocation} />
        {hint ? <Muted>{hint}</Muted> : null}

        <View className="gap-2">
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">Name</Text>
          <TextInput className={`${input} h-14`} placeholder="Home, Work…" placeholderTextColor={palette.muted} value={label} onChangeText={setLabel} maxLength={40} />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">Full address</Text>
          <TextInput
            className={`${input} min-h-28 py-3`}
            placeholder="House / flat no., street, area, city, pincode"
            placeholderTextColor={palette.muted}
            value={fullAddress}
            onChangeText={setFullAddress}
            multiline
            textAlignVertical="top"
            maxLength={300}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">Phone number for the delivery partner</Text>
          <TextInput
            className={`${input} h-14`}
            placeholder="9876543210"
            placeholderTextColor={palette.muted}
            keyboardType="phone-pad"
            autoComplete="tel"
            value={phone}
            onChangeText={setPhone}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-ink dark:text-ink-dark">Make this my default address</Text>
          <Switch value={isDefault} onValueChange={setIsDefault} />
        </View>

        {error ? <Text className="text-sm font-medium text-red-600">{error}</Text> : null}
        <Button label="Save address" loading={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
