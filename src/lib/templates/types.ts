export type TemplateOrientation = "square" | "portrait" | "landscape";
export type TemplateType = "image" | "video";

export interface Template {
  id: string;
  title: string;
  thumbnail: string;
  scene: string;
  purpose: string;
  industry: string;
  style: string;
  orientation: TemplateOrientation;
  downloads: number;
  uploadedAt: string;
  type: TemplateType;
  size: string;
  tags: string[];
  duration?: string;
  source?: string;
  sourceId?: string;
  sourceUrl?: string;
}

export interface TemplateFilterOptions {
  scenes: string[];
  purposes: string[];
  industries: string[];
  styles: string[];
  orientations: string[];
  sorts: string[];
}

export interface TemplateCatalog {
  meta: {
    source: string;
    clonedAt: string;
    count: number;
    brand: string;
  };
  filterOptions: TemplateFilterOptions;
  templates: Template[];
}
