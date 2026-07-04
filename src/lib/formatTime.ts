/** 格式化为 YYYY-MM-DD HH:mm:ss，兼容毫秒时间戳 / ISO 字符串 */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value == null || value === '') return ''

  let date: Date
  if (value instanceof Date) {
    date = value
  } else if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    date = new Date(Number(value))
  } else {
    date = new Date(String(value).replace('T', ' '))
  }

  if (Number.isNaN(date.getTime())) return String(value)

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
