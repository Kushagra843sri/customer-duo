import type { LucideIcon } from 'lucide-react-native';
import { Ban, CircleCheck, CircleX, Clock, PackageCheck, Truck } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Tones } from '@/constants/theme';
import type { Tone } from '@/constants/theme';
import { formatOrderStatus } from '@/lib/orderStatus';

import { useAccentSoft, useIsDark } from './theme';

export function Badge({ label, tone = 'neutral', icon: Icon }: { label: string; tone?: Tone; icon?: LucideIcon }) {
  const dark = useIsDark();
  const t = Tones[tone];
  const fg = dark ? t.fgDark : t.fg;
  return (
    <View style={{ backgroundColor: dark ? t.bgDark : t.bg }} className="flex-row items-center gap-1 self-start rounded-full px-2.5 py-1">
      {Icon ? <Icon size={12} color={fg} /> : null}
      <Text style={{ color: fg }} className="text-xs font-bold">
        {label}
      </Text>
    </View>
  );
}

const STATUS_STYLE: Record<string, { tone: Tone; icon: LucideIcon }> = {
  // order statuses
  pending: { tone: 'warn', icon: Clock },
  confirmed: { tone: 'info', icon: CircleCheck },
  preparing: { tone: 'info', icon: PackageCheck },
  ready_for_pickup: { tone: 'info', icon: PackageCheck },
  out_for_delivery: { tone: 'info', icon: Truck },
  delivered: { tone: 'success', icon: CircleCheck },
  cancelled: { tone: 'danger', icon: Ban },
  rejected: { tone: 'danger', icon: CircleX },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? { tone: 'neutral' as Tone, icon: Clock };
  return <Badge label={formatOrderStatus(status)} tone={style.tone} icon={style.icon} />;
}

/** Circular initial, e.g. driver avatar. */
export function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const soft = useAccentSoft();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: soft.bg }} className="items-center justify-center">
      <Text style={{ color: soft.fg, fontSize: size * 0.42 }} className="font-extrabold">
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}
