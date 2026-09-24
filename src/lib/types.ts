// Modelo de datos completo de la app.
// Cada tipo corresponde a una tabla de supabase/schema.sql.

export type Id = string

export interface Dimension {
  medida: string
  valor: string
}

export interface Ficha {
  version: string
  fecha: string // AAAA-MM-DD
  descripcion: string
  dimensiones: Dimension[]
  material_exterior: string
  material_interior: string
  colores: string
  diseno_exterior: string[]
  diseno_interior: string[]
  herrajes: string[]
  fotos: string[] // rutas en el storage
}

export interface Producto {
  id: Id
  codigo: string
  nombre: string
  tipologia: string
  es_subproducto: boolean
  ficha: Ficha
  orden: number
}

export interface Categoria {
  id: Id
  nombre: string
  es_cuero: boolean
  orden: number
}

export type EstadoTanda = 'planificada' | 'en_produccion' | 'terminada'

export interface Tanda {
  id: Id
  nombre: string
  fecha: string | null
  estado: EstadoTanda
  unidades: Record<Id, number>
  notas: string
}

export type TipoGasto = 'especifico' | 'general' | 'arranque' | 'recurrente'
export type EstadoGasto = 'real' | 'estimado'
export type ModoMonto = 'total' | 'unitario' | 'por_unidad_tanda'

export interface Gasto {
  id: Id
  fecha: string | null
  descripcion: string
  categoria_id: Id | null
  tipo: TipoGasto
  estado: EstadoGasto
  pendiente: boolean
  modo_monto: ModoMonto
  monto: number | null
  precio_unitario: number | null
  cantidad: number | null
  sin_iva: boolean
  tanda_id: Id | null
  productos: Id[]
  reparto: Record<Id, number> | null
  frecuencia: 'mensual' | 'anual' | null
  notas: string
}

export type MetodoReparto = 'por_unidad' | 'por_costo_directo' | 'por_ventas'

export type MedioPago =
  | 'mp_transferencia'
  | 'mp_debito'
  | 'mp_credito_1'
  | 'mp_3_cuotas'
  | 'mp_6_cuotas'

export interface Comisiones {
  tiendanube: number | null
  mp_transferencia: number | null
  mp_debito: number | null
  mp_credito_1: number | null
  mp_3_cuotas: number | null
  mp_6_cuotas: number | null
}

export interface ConfigDatos {
  seed_version: number
  metodo_reparto_generales: MetodoReparto
  // tanda que absorbe el arranque de cada producto (null = la primera)
  arranque_tanda: Record<Id, Id | null>
  ventas_mensuales_modo: 'total' | 'por_producto'
  ventas_mensuales_total: number | null
  ventas_mensuales_por_producto: Record<Id, number | null>
  comisiones: Comisiones
  iva_comisiones: boolean
  retencion_iibb: number | null
  medios_ofrecidos: MedioPago[]
  margenes: number[]
  margen_principal: number
  redondeo: 0 | 1000 | 5000
  subproductos_en_generales: boolean
  // en la tanda que absorbe el arranque, el precio sugerido incluye muestras y moldes
  precio_con_arranque: boolean
}

export interface Configuracion {
  id: Id
  datos: ConfigDatos
}

export interface Tablas {
  categorias: Categoria
  productos: Producto
  tandas: Tanda
  gastos: Gasto
  configuracion: Configuracion
}

export type NombreTabla = keyof Tablas
