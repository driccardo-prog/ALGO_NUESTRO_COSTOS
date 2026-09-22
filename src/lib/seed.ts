// Datos iniciales que se cargan la primera vez que Loli entra a la app.

import { pesos } from './format'
import type { Categoria, ConfigDatos, Ficha, Gasto, Producto } from './types'

export const SEED_VERSION = 1

const uid = () => crypto.randomUUID()

export function fichaVacia(): Ficha {
  return {
    version: 'v1',
    fecha: '',
    descripcion: '',
    dimensiones: [],
    material_exterior: '',
    material_interior: '',
    colores: '',
    diseno_exterior: [],
    diseno_interior: [],
    herrajes: [],
    fotos: [],
  }
}

export function configInicial(): ConfigDatos {
  return {
    seed_version: SEED_VERSION,
    metodo_reparto_generales: 'por_unidad',
    arranque_tanda: {},
    ventas_mensuales_modo: 'total',
    ventas_mensuales_total: null,
    ventas_mensuales_por_producto: {},
    comisiones: {
      tiendanube: null,
      mp_transferencia: null,
      mp_debito: null,
      mp_credito_1: null,
      mp_3_cuotas: null,
      mp_6_cuotas: null,
    },
    iva_comisiones: true,
    retencion_iibb: null,
    medios_ofrecidos: ['mp_transferencia', 'mp_credito_1', 'mp_3_cuotas'],
    margenes: [30, 40, 50, 60],
    margen_principal: 50,
    redondeo: 1000,
    subproductos_en_generales: true,
  }
}

const NOMBRES_CATEGORIAS = [
  'Cuero',
  'Insumos (cierres, forro, herrajes, hilo)',
  'Mano de obra taller',
  'Trenzador',
  'Packaging',
  'Flete / logística',
  'Nafta / traslados',
  'Plataforma (Tiendanube, dominio)',
  'Impuestos (monotributo)',
  'Muestras y desarrollo',
  'Otros',
]

export function datosIniciales() {
  const categorias: Categoria[] = NOMBRES_CATEGORIAS.map((nombre, i) => ({
    id: uid(),
    nombre,
    es_cuero: nombre === 'Cuero',
    orden: i,
  }))
  const cat = (prefijo: string) => categorias.find((c) => c.nombre.startsWith(prefijo))!.id

  const gauchita: Producto = {
    id: uid(),
    codigo: 'AN_001',
    nombre: 'Cartera Gauchita',
    tipologia: 'Tote',
    es_subproducto: false,
    orden: 1,
    ficha: {
      ...fichaVacia(),
      version: 'v2',
      descripcion:
        'Tote rectangular de cuero, con costura diagonal en el frente y manija trenzada de hombro.',
      dimensiones: [
        { medida: 'Ancho', valor: '36 cm' },
        { medida: 'Profundidad', valor: '12 cm' },
        { medida: 'Alto', valor: '30 cm' },
        { medida: 'Pico', valor: 'achicar 5 cm' },
        { medida: 'Bolsillo', valor: '28 × 15 cm' },
        { medida: 'Manija trenzada de hombro', valor: '28 cm (desde el centro)' },
      ],
      material_exterior: 'Cuero Pampa Invierno (Natureza)',
      material_interior: 'Sin forro',
      colores: 'Negro, Chocolate, Suela',
      diseno_exterior: [
        'Forma rectangular',
        'Costura diagonal en el frente',
        'Bolsillo en el dorso',
        'Manija trenzada de hombro',
      ],
      diseno_interior: [
        'Sin forro',
        'Bolsillo interno con cierre',
        'Anillo interior de cuero para llavero',
      ],
      herrajes: ['Cierre con broche imán niquelado'],
    },
  }

  const potra: Producto = {
    id: uid(),
    codigo: 'AN_002',
    nombre: 'Cartera Potra',
    tipologia: 'Bandolera',
    es_subproducto: false,
    orden: 2,
    ficha: {
      ...fichaVacia(),
      version: 'v2',
      descripcion: 'Bandolera tipo pouch con frunce superior y flecos finos y largos a los lados.',
      dimensiones: [
        { medida: 'Ancho', valor: '20 cm' },
        { medida: 'Profundidad', valor: '6,5 cm' },
        { medida: 'Alto', valor: '14 cm' },
        { medida: 'Largo flecos', valor: 'achicar 5 cm' },
        { medida: 'Bolsillo interior', valor: '16 × 10 cm' },
        {
          medida: 'Manija regulable con hebilla (tira 1 cm)',
          valor: '3 medidas: 55 / 53 / 50 cm (desde el centro)',
        },
      ],
      material_exterior: 'Cuero Cóndor',
      material_interior: 'Microfibra',
      colores: 'Negro, Rubí',
      diseno_exterior: [
        'Silueta pouch con frunce superior',
        'Flecos finos y largos a los lados (10 cm más largos que la muestra)',
        'Un fleco de cada lado funciona como cordón de fruncido',
        'Manija regulable con hebilla',
      ],
      diseno_interior: ['Forrado en microfibra', 'Bolsillo interno con cierre'],
      herrajes: ['Cierre con broche imán forrado en el centro', 'Hebilla para manija regulable'],
    },
  }

  const criolla: Producto = {
    id: uid(),
    codigo: 'AN_003',
    nombre: 'Matera Criolla',
    tipologia: 'Tote / matero / multiuso',
    es_subproducto: false,
    orden: 3,
    ficha: {
      ...fichaVacia(),
      version: 'v2',
      descripcion:
        'Tote matero multiuso, con manijas trenzadas tipo soga y divisor central con soporte para bombilla.',
      dimensiones: [
        { medida: 'Ancho', valor: '36 cm' },
        { medida: 'Profundidad', valor: '16 cm' },
        { medida: 'Alto', valor: '42 cm' },
        { medida: 'Fuelle exterior', valor: '16 cm' },
        { medida: 'Fuelle divisor interior con cierre', valor: '2 cm' },
        { medida: 'Manija trenzada de hombro', valor: '28 cm (desde el centro)' },
        { medida: 'Bolsillo exterior (sin división)', valor: '32 × 25 cm' },
        { medida: 'Bolsillo interior lado A (sin cierre)', valor: '18 × 12 cm' },
        { medida: 'Bolsillo interior lado B (sin cierre)', valor: '25 × 15 cm' },
      ],
      material_exterior: 'Cuero Pampa Invierno (Natureza)',
      material_interior: 'Microfibra',
      colores: 'Negro, Chocolate, Suela',
      diseno_exterior: ['Manijas trenzadas tipo soga', 'Bolsillo exterior sin división'],
      diseno_interior: [
        'Forrado en microfibra',
        'Divisor central con cierre tipo bolsillo',
        'Soporte para bombilla',
        'Bolsillos interiores sin cierre (lado A y lado B)',
      ],
      herrajes: ['Cierre en el divisor central'],
    },
  }

  const productos = [gauchita, potra, criolla]
  const todos = productos.map((p) => p.id)

  const base = (g: Partial<Gasto> & Pick<Gasto, 'descripcion' | 'tipo'>): Gasto => ({
    id: uid(),
    fecha: null,
    categoria_id: null,
    estado: 'real',
    pendiente: false,
    modo_monto: 'total',
    monto: null,
    precio_unitario: null,
    cantidad: null,
    sin_iva: false,
    tanda_id: null,
    productos: [],
    reparto: null,
    frecuencia: null,
    notas: '',
    ...g,
  })

  const confirmar = 'Confirmar si ya está pagado.'

  const arranque: Gasto[] = [
    base({
      descripcion: 'Anticipo taller: muestras en friselina',
      categoria_id: cat('Muestras'),
      tipo: 'arranque',
      monto: 100000,
      productos: todos,
      notas: 'Completar la fecha.',
    }),
    base({
      descripcion: '2 chapas de cuero para muestras',
      categoria_id: cat('Cuero'),
      tipo: 'arranque',
      monto: 95000,
      productos: todos,
      notas: 'Puede sobrar cuero para producción, revisar.',
    }),
    base({
      descripcion: 'Molde / muestra — Cartera Gauchita',
      categoria_id: cat('Muestras'),
      tipo: 'arranque',
      monto: 50000,
      productos: [gauchita.id],
      notas: confirmar,
    }),
    base({
      descripcion: 'Molde / muestra — Cartera Potra',
      categoria_id: cat('Muestras'),
      tipo: 'arranque',
      monto: 50000,
      productos: [potra.id],
      notas: confirmar,
    }),
    base({
      descripcion: 'Molde / muestra — Matera Criolla',
      categoria_id: cat('Muestras'),
      tipo: 'arranque',
      monto: 50000,
      productos: [criolla.id],
      notas: confirmar,
    }),
  ]

  // Cotización Pymedia: precios sin IVA; la app suma el 21%.
  const packaging = (
    descripcion: string,
    productosIds: string[],
    sinIva: number,
    conIva: string,
    nota: string,
  ) =>
    base({
      descripcion,
      categoria_id: cat('Packaging'),
      tipo: 'especifico',
      estado: 'estimado',
      modo_monto: 'por_unidad_tanda',
      precio_unitario: sinIva,
      sin_iva: true,
      productos: productosIds,
      notas:
        `Cotización Pymedia: ${pesos(sinIva, true)} sin IVA → $ ${conIva} con IVA (por unidad).` +
        (nota ? ` ${nota}` : ''),
    })

  const cotizaciones: Gasto[] = [
    packaging(
      'Caja cartulina grande',
      [gauchita.id, criolla.id],
      5307.67,
      '6.422,28',
      'Troquel 319 queda chico para la profundidad nueva: pendiente recotizar.',
    ),
    packaging(
      'Caja cartulina chica',
      [potra.id],
      4595.27,
      '5.560,28',
      'Confirmar troquel 279 o medida a medida 25×10×20 cm.',
    ),
    packaging(
      'Bolsa de lienzo',
      todos,
      5253.35,
      '6.356,55',
      'Medida sin confirmar; comparar con segundo proveedor.',
    ),
    packaging('Bolsa courier grande', [gauchita.id, criolla.id], 2272.42, '2.749,63', ''),
    packaging('Bolsa courier chica', [potra.id], 1495.29, '1.809,30', ''),
  ]

  const pendientes: Gasto[] = [
    base({
      descripcion: 'Trenzador',
      categoria_id: cat('Trenzador'),
      tipo: 'especifico',
      estado: 'estimado',
      pendiente: true,
      productos: [gauchita.id, criolla.id],
      notas: 'Falta cotizar las manijas trenzadas.',
    }),
    base({
      descripcion: 'Muestras en cuero del taller',
      categoria_id: cat('Muestras'),
      tipo: 'arranque',
      estado: 'estimado',
      pendiente: true,
      productos: todos,
    }),
    base({
      descripcion: 'Stickers y tarjetas',
      categoria_id: cat('Packaging'),
      tipo: 'general',
      estado: 'estimado',
      pendiente: true,
    }),
    base({
      descripcion: 'Cuota del monotributo',
      categoria_id: cat('Impuestos'),
      tipo: 'recurrente',
      frecuencia: 'mensual',
      estado: 'estimado',
      pendiente: true,
    }),
    base({
      descripcion: 'Plan de Tiendanube',
      categoria_id: cat('Plataforma'),
      tipo: 'recurrente',
      frecuencia: 'mensual',
      estado: 'estimado',
      pendiente: true,
    }),
  ]

  return {
    categorias,
    productos,
    gastos: [...arranque, ...cotizaciones, ...pendientes],
    config: configInicial(),
  }
}
