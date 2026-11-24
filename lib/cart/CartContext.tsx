"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface CartItem {
  variantId: string;
  slug: string;
  nombre: string;
  color: string;
  medida: string; // "Única" cuando el producto no tiene medidas
  etiquetaMedida: string; // "Medida", "Talle", "Letra"…
  imagen: string | null;
  precio: number; // precio unitario mostrado (la base lo recalcula al comprar)
  stock: number; // tope de cantidad al momento de agregar
  cantidad: number;
}

interface CartValue {
  items: CartItem[];
  mounted: boolean;
  /** Panel lateral "Agregaste al carrito". */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  addItem: (item: CartItem) => void;
  setCantidad: (variantId: string, cantidad: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  /** Actualiza precio y stock con los datos del servidor; devuelve qué cambió. */
  sincronizar: (estados: { id: string; precio: number; stock: number }[]) => string[];
  totalUnidades: number;
  subtotal: number;
}

const STORAGE_KEY = "hogar-lina-carrito-v1";
const CartContext = createContext<CartValue | null>(null);

function tope(stock: number): number {
  return Math.max(0, Math.min(99, stock));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed.filter((i) => i && i.variantId));
      }
    } catch {
      // storage no disponible: carrito en memoria
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items, mounted]);

  const addItem = useCallback((nuevo: CartItem) => {
    if (nuevo.cantidad <= 0) return;
    setItems((prev) => {
      const existente = prev.find((i) => i.variantId === nuevo.variantId);
      if (!existente) {
        return [...prev, { ...nuevo, cantidad: Math.min(nuevo.cantidad, tope(nuevo.stock)) }];
      }
      return prev.map((i) =>
        i.variantId === nuevo.variantId
          ? {
              ...i,
              ...nuevo,
              cantidad: Math.min(i.cantidad + nuevo.cantidad, tope(nuevo.stock)),
            }
          : i
      );
    });
    setDrawerOpen(true);
  }, []);

  const setCantidad = useCallback((variantId: string, cantidad: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.variantId === variantId
            ? { ...i, cantidad: Math.min(Math.max(0, Math.floor(cantidad)), tope(i.stock)) }
            : i
        )
        .filter((i) => i.cantidad > 0)
    );
  }, []);

  const remove = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // Copia sincrónica de los ítems para calcular cambios sin depender del updater.
  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  const sincronizar = useCallback(
    (estados: { id: string; precio: number; stock: number }[]) => {
      const avisos: string[] = [];
      const porId = new Map(estados.map((e) => [e.id, e]));
      const next = itemsRef.current.flatMap((i) => {
        const e = porId.get(i.variantId);
        if (!e) {
          avisos.push(`${i.nombre} (${i.color}) ya no está disponible y lo sacamos del carrito.`);
          return [];
        }
        if (e.stock <= 0) {
          avisos.push(`${i.nombre} (${i.color}) se agotó y lo sacamos del carrito.`);
          return [];
        }
        let cantidad = i.cantidad;
        if (cantidad > e.stock) {
          cantidad = e.stock;
          avisos.push(`De ${i.nombre} (${i.color}) quedan ${e.stock}: ajustamos la cantidad.`);
        }
        if (e.precio !== i.precio) avisos.push(`Se actualizó el precio de ${i.nombre}.`);
        return [{ ...i, precio: e.precio, stock: e.stock, cantidad }];
      });
      setItems(next);
      return avisos;
    },
    []
  );

  const totalUnidades = useMemo(() => items.reduce((s, i) => s + i.cantidad, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.cantidad * i.precio, 0),
    [items]
  );

  const value: CartValue = {
    items,
    mounted,
    drawerOpen,
    setDrawerOpen,
    addItem,
    setCantidad,
    remove,
    clear,
    sincronizar,
    totalUnidades,
    subtotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
