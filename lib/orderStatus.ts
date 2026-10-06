/** Customer-facing wording for the order statuses the server declares. */
const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Waiting for the shop',
  confirmed: 'Confirmed',
  preparing: 'Being prepared',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  rejected: 'Declined by the shop',
};

export function formatOrderStatus(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

/** Statuses after which nothing more will happen. */
export const FINAL_ORDER_STATUSES = ['delivered', 'cancelled', 'rejected'];

/** The customer can cancel only before the shop accepts. */
export function canCancel(status: string): boolean {
  return status === 'pending';
}

/** Happy-path steps shown on the order screen. */
export const ORDER_STEPS: { status: string; label: string }[] = [
  { status: 'pending', label: 'Order placed' },
  { status: 'confirmed', label: 'Shop confirmed' },
  { status: 'preparing', label: 'Being prepared' },
  { status: 'ready_for_pickup', label: 'Ready for pickup' },
  { status: 'out_for_delivery', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
];
