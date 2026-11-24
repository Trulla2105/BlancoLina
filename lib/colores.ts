/**
 * Paleta base para los colores de los productos (chip de color). Los colores
 * que se cargan en la tabla palette_colors se suman como "Paleta de la tienda".
 */
export interface ColorPaleta {
  nombre: string;
  hex: string;
}

export const PALETA_COLORES: { grupo: string; colores: ColorPaleta[] }[] = [
  {
    grupo: "Neutros",
    colores: [
      { nombre: "Blanco", hex: "#f5f4f1" },
      { nombre: "Crudo", hex: "#eae5da" },
      { nombre: "Natural", hex: "#e4dccd" },
      { nombre: "Beige", hex: "#e2d5c4" },
      { nombre: "Arena", hex: "#d6c6ad" },
      { nombre: "Visón", hex: "#b9a99a" },
      { nombre: "Cemento", hex: "#c7c0b8" },
      { nombre: "Gris perla", hex: "#d3d2d0" },
      { nombre: "Gris plata", hex: "#bbb4b4" },
      { nombre: "Gris oscuro", hex: "#7d7a78" },
      { nombre: "Negro", hex: "#1d1b1f" },
    ],
  },
  {
    grupo: "Cálidos",
    colores: [
      { nombre: "Rosa tierra", hex: "#cc9998" },
      { nombre: "Coral", hex: "#f45b57" },
      { nombre: "Hot pink", hex: "#ec3d75" },
      { nombre: "Bermellón", hex: "#d9233e" },
      { nombre: "Rojo ladrillo", hex: "#b55041" },
      { nombre: "Terracota", hex: "#c06a4b" },
      { nombre: "Bordó", hex: "#6a152b" },
      { nombre: "Mostaza", hex: "#d1a23d" },
    ],
  },
  {
    grupo: "Fríos",
    colores: [
      { nombre: "Celeste", hex: "#93b6df" },
      { nombre: "Francia", hex: "#1f5dab" },
      { nombre: "Marino", hex: "#1c3751" },
      { nombre: "Petróleo", hex: "#24505a" },
      { nombre: "Benetton", hex: "#18bdab" },
      { nombre: "Verde seco", hex: "#9aa58a" },
      { nombre: "Verde inglés", hex: "#455954" },
      { nombre: "Lavanda", hex: "#b7a7cf" },
      { nombre: "Uva", hex: "#8e5f8a" },
    ],
  },
];
