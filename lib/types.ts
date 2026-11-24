export type OrderStatus =
  | "pendiente_pago"
  | "pagado"
  | "enviado"
  | "entregado"
  | "cancelado";

export const ORDER_STATUSES: OrderStatus[] = [
  "pendiente_pago",
  "pagado",
  "enviado",
  "entregado",
  "cancelado",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export type MetodoPago = "transferencia" | "mercadopago";

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  transferencia: "Transferencia bancaria",
  mercadopago: "Mercado Pago",
};

export interface Category {
  id: string;
  nombre: string;
  slug: string;
  imagen: string | null;
  orden: number;
}

export interface Linea {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  imagen: string | null;
  orden: number;
}

export interface ProductVariant {
  id: string;
  color_id: string;
  medida: string;
  precio: number;
  precio_oferta: number | null;
  stock: number;
}

export interface ProductColor {
  id: string;
  nombre: string;
  hex: string | null;
  foto: string | null;
  orden: number;
  product_variants: ProductVariant[];
}

export interface ProductImage {
  id: string;
  url: string;
  orden: number;
}

export interface Product {
  id: string;
  nombre: string;
  sku: string;
  slug: string;
  marca: string | null;
  descripcion: string | null;
  linea: string | null;
  etiqueta_color: string;
  etiqueta_medida: string;
  activo: boolean;
  destacado: boolean;
  ocultar_nuevo: boolean;
  orden: number;
  created_at: string;
  categories: Pick<Category, "id" | "nombre" | "slug"> | null;
  product_colors: ProductColor[];
  product_images: ProductImage[];
}

export interface HeroBanner {
  id: string;
  url: string;
  url_mobile: string | null;
  titulo: string | null;
  subtitulo: string | null;
  boton: string | null;
  link: string | null;
  orden: number;
  activo: boolean;
}

/** Condiciones comerciales (site_settings 'comercial'). */
export interface ConfigComercial {
  transferencia_pct: number;
  cuotas: number;
  envio_gratis_desde: number | null;
  costo_envio: number | null; // null = se coordina con el cliente
  retiro_habilitado: boolean;
  retiro_direccion: string;
}

export const DEFAULT_COMERCIAL: ConfigComercial = {
  transferencia_pct: 0,
  cuotas: 1,
  envio_gratis_desde: null,
  costo_envio: null,
  retiro_habilitado: false,
  retiro_direccion: "",
};

/** Datos de contacto de la tienda (site_settings 'contacto'). */
export interface ConfigContacto {
  whatsapp: string;
  email: string;
  direccion: string;
  instagram: string;
  horario: string;
}

export const DEFAULT_CONTACTO: ConfigContacto = {
  whatsapp: "",
  email: "",
  direccion: "",
  instagram: "",
  horario: "",
};

/** Datos para pagar por transferencia (site_settings 'transferencia'). */
export interface ConfigTransferencia {
  titular: string;
  cuit: string;
  banco: string;
  cbu: string;
  alias: string;
}

export const DEFAULT_TRANSFERENCIA: ConfigTransferencia = {
  titular: "",
  cuit: "",
  banco: "",
  cbu: "",
  alias: "",
};

export interface PaletteColor {
  id: string;
  nombre: string;
  hex: string;
  orden: number;
}

export interface InstagramPost {
  id: string;
  imagen: string;
  link: string;
  orden: number;
}

export interface OrderItem {
  id: string;
  producto: string;
  sku: string;
  color: string;
  medida: string;
  cantidad: number;
  precio_unitario: number;
}

export interface Order {
  id: string;
  numero: number;
  token: string;
  estado: OrderStatus;
  metodo_pago: MetodoPago;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  entrega: "domicilio" | "retiro";
  calle: string | null;
  altura: string | null;
  piso_depto: string | null;
  codigo_postal: string | null;
  localidad: string | null;
  provincia: string | null;
  notas: string | null;
  subtotal: number;
  descuento_pct: number;
  descuento: number;
  envio: number | null;
  total: number;
  mp_payment_id: string | null;
  mp_status: string | null;
  mp_status_detail: string | null;
  pagado_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
}

/** Lo que devuelve ver_pedido(token): la vista del cliente. */
export interface PedidoPublico {
  numero: number;
  token: string;
  estado: OrderStatus;
  metodo_pago: MetodoPago;
  created_at: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono: string;
  entrega: "domicilio" | "retiro";
  calle: string | null;
  altura: string | null;
  piso_depto: string | null;
  codigo_postal: string | null;
  localidad: string | null;
  provincia: string | null;
  subtotal: number;
  descuento_pct: number;
  descuento: number;
  envio: number | null;
  total: number;
  mp_status: string | null;
  items: Omit<OrderItem, "id">[];
}

export interface Arrepentimiento {
  id: string;
  codigo: string;
  numero_pedido: string | null;
  nombre: string;
  email: string;
  telefono: string | null;
  dni: string | null;
  motivo: string | null;
  atendido: boolean;
  created_at: string;
}

export interface Viewer {
  userId: string | null;
  email: string | null;
  isAdmin: boolean;
}

export const ANON_VIEWER: Viewer = { userId: null, email: null, isAdmin: false };

/** Estado devuelto por las server actions de formularios (useActionState). */
export interface FormState {
  error?: string;
  ok?: string;
}

/** Todas las variantes de un producto, aplanando los colores. */
export function allVariants(product: Product): ProductVariant[] {
  return product.product_colors.flatMap((color) => color.product_variants);
}
