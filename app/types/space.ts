// app/src/types/space.ts

export type SpaceBlockType =
  | 'author'
  | 'book'
  | 'quote'
  | 'poem'
  | 'header'
  | 'text'
  | 'image'
  | 'spacer';

export type SpaceBlock = {
  id: string;
  type: string;
  title: string;       // Ej: "Author"
  description: string; // Subtítulo / ayuda
  value: string;       // Contenido que escribe el usuario

  //Author
  authorName?: string;
  themeId?: string;
  accentColor?: string;
  accentTextColor?: string;

  //Book
  bookTitle?: string;
  bookAuthor?: string;

  //Quote / Poem
  textStyleId?: string;

  //Section header
  sectionBgColor?: string;
  sectionTextColor?: string;

  //Spacer
  spacerHeight?: number;

  //Image
  imageUri?: string | null;
  imageWidthRatio?: number;  // 0.5 – 1.0 (50–100% del ancho)
  imageHeight?: number;
};

export type AddOption = {
  type: SpaceBlockType;
  title: string;
  description: string;
  icon: string;        // nombre de Ionicons
};
