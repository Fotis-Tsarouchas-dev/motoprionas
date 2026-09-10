export function formatPrice(value: number | null) {
  return value === null ? 'Ρωτήστε μας' : `${new Intl.NumberFormat('el-GR').format(value)} €`;
}
export function formatKm(value: number) {
  return `${new Intl.NumberFormat('el-GR').format(value)} km`;
}
export function formatCc(value: number) { return `${value} cc`; }
