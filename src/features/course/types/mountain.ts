export interface ImportMountain {
  mountainId: string;
  mountainName: string;
}

export interface ImportMountainPage {
  items: ImportMountain[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
