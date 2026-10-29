import { z } from 'zod'

const optionalNumber = (schema: z.ZodNumber) => z.preprocess(v => v === '' || v == null ? undefined : Number(v), schema.optional())
export const placeMapSchema = z.object({
  available: z.boolean(), version: z.coerce.number().int().min(0),
  objectKey: z.string().trim(), checksum: z.string().trim(),
  sizeBytes: optionalNumber(z.number().int().min(0)),
  minZoom: optionalNumber(z.number().int().min(0).max(22)),
  maxZoom: optionalNumber(z.number().int().min(0).max(22)),
  minLat: optionalNumber(z.number().min(-90).max(90)), maxLat: optionalNumber(z.number().min(-90).max(90)),
  minLon: optionalNumber(z.number().min(-180).max(180)), maxLon: optionalNumber(z.number().min(-180).max(180)),
}).superRefine((data, ctx) => {
  if (data.available && !data.objectKey) ctx.addIssue({ code: 'custom', path: ['objectKey'], message: 'Cần có file bản đồ trước khi bật tải xuống.' })
  if (data.minZoom != null && data.maxZoom != null && data.minZoom > data.maxZoom) ctx.addIssue({ code: 'custom', path: ['maxZoom'], message: 'Max zoom phải lớn hơn hoặc bằng min zoom.' })
  const bounds = [data.minLat, data.minLon, data.maxLat, data.maxLon]
  if (bounds.some(v => v != null) && (bounds.some(v => v == null) || data.minLat! >= data.maxLat! || data.minLon! >= data.maxLon!)) ctx.addIssue({ code: 'custom', path: ['maxLat'], message: 'Nhập đủ 4 tọa độ; giới hạn trên phải lớn hơn giới hạn dưới.' })
})
