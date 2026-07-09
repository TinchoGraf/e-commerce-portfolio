const ORDER_STATUS_MAP = {
  PENDING: { variant: 'gray', label: 'Pendiente' },
  CONFIRMED: { variant: 'blue', label: 'Confirmado' },
  PROCESSING: { variant: 'yellow', label: 'Procesando' },
  SHIPPED: { variant: 'purple', label: 'Enviado' },
  DELIVERED: { variant: 'green', label: 'Entregado' },
  CANCELLED: { variant: 'red', label: 'Cancelado' },
};

const PAYMENT_STATUS_MAP = {
  PENDING: { variant: 'gray', label: 'Pago pendiente' },
  APPROVED: { variant: 'green', label: 'Pago aprobado' },
  REJECTED: { variant: 'red', label: 'Pago rechazado' },
  REFUNDED: { variant: 'blue', label: 'Reembolsado' },
};

export function getOrderStatusBadge(status) {
  return ORDER_STATUS_MAP[status] || { variant: 'gray', label: status };
}

export function getPaymentStatusBadge(status) {
  return PAYMENT_STATUS_MAP[status] || { variant: 'gray', label: status };
}
