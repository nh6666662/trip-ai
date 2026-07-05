/**
 * 行程导出工具
 * 支持导出 PDF 和浏览器打印
 */

import type { Trip, TripNode } from '@/types/database'

export interface ExportOptions {
  trip: Trip
  nodes: TripNode[]
  format: 'pdf' | 'print'
}

/**
 * 导出行程为 PDF
 * 原理：渲染隐藏的 HTML 模板 → html2canvas 截图 → jspdf 组装 PDF
 */
export async function exportTripToPDF(options: ExportOptions): Promise<void> {
  const { trip, nodes } = options

  const html2canvas = (await import('html2canvas')).default
  const { jsPDF } = await import('jspdf')

  const container = document.createElement('div')
  container.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;background:white;padding:40px;font-family:sans-serif;'
  container.innerHTML = buildPDFHTML(trip, nodes)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const imgData = canvas.toDataURL('image/png')

    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= 297

    while (heightLeft > 0) {
      position = -297 * Math.ceil((imgHeight - heightLeft) / 297)
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297
    }

    pdf.save(`${trip.destination}-${trip.start_date}-行程.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}

/** 浏览器打印 */
export function printTrip(trip: Trip, nodes: TripNode[]): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(`
    <!DOCTYPE html><html><head><title>${trip.destination} 行程</title>
    <style>
      body { font-family: sans-serif; padding: 40px; color: #262626; }
      h1 { color: #6366F1; text-align: center; font-size: 28px; }
      .subtitle { color: #737373; text-align: center; font-size: 14px; margin-top: 8px; }
      .day-title { border-bottom: 2px solid #E5E5E5; padding-bottom: 8px; font-size: 18px; margin-top: 24px; }
      .node { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid #F5F5F5; }
      .time { color: #6366F1; font-weight: 600; min-width: 50px; }
      .name { font-weight: 500; }
      .meta { color: #737373; font-size: 12px; }
      @media print { body { padding: 20px; } }
    </style></head><body>${buildPDFHTML(trip, nodes)}</body></html>
  `)
  printWindow.document.close()
  printWindow.print()
}

/** 构建 PDF HTML 模板 */
function buildPDFHTML(trip: Trip, nodes: TripNode[]): string {
  const nodesByDay = groupByDay(nodes)
  return `
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="color:#6366F1;font-size:28px;margin:0;">${trip.destination} 行程</h1>
      <p style="color:#737373;font-size:14px;margin-top:8px;">
        ${trip.start_date} ~ ${trip.end_date} · ${trip.traveler_count}人 · ${trip.pace === 'tight' ? '紧凑版' : '松弛版'}
      </p>
    </div>
    ${Object.entries(nodesByDay)
      .map(
        ([day, dayNodes]) => `
      <div style="margin-bottom:24px;">
        <h2 style="color:#262626;font-size:18px;border-bottom:2px solid #E5E5E5;padding-bottom:8px;">
          第 ${day} 天
        </h2>
        ${dayNodes
          .map(
            (node) => `
          <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #F5F5F5;">
            <span style="color:#6366F1;font-weight:600;min-width:50px;">
              ${formatTime(node.start_time)}
            </span>
            <div>
              <div style="font-weight:500;color:#262626;">${node.name}</div>
              <div style="color:#737373;font-size:12px;">
                ${node.duration_minutes}分钟${node.transit_minutes ? ` · 交通${node.transit_minutes}分钟` : ''}
              </div>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    `,
      )
      .join('')}
    <div style="text-align:center;color:#A3A3A3;font-size:11px;margin-top:40px;">
      由旅智 TripAI 生成 · ${new Date().toLocaleDateString('zh-CN')}
    </div>
  `
}

function groupByDay(nodes: TripNode[]): Record<number, TripNode[]> {
  const groups: Record<number, TripNode[]> = {}
  nodes.forEach((node) => {
    const meta = node.metadata as Record<string, unknown> | null
    const day = (meta?.day as number) ?? 1
    if (!groups[day]) groups[day] = []
    groups[day].push(node)
  })
  return groups
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}
