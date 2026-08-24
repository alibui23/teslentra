export type Part = {
  id: number;
  partNumber: string;
  partName: string;
  description: string;
  category: string;

  imageUrl: string;
  imageDescription: string;

  manufacturer: string;
  price: number | null;
  supplierNumber: string;

  sharepointUrl: string;
  sharepointDescription: string;

  createdAt: string | null;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;

  directSubPartCount: number;
  usedInCount: number;
};

export type NewPart = {
  partName: string;
  description: string;
  category: string;
  manufacturer: string;
  price: string;
  supplierNumber: string;

  imageUrl: string;
  imageDescription: string;

  sharepointUrl: string;
  sharepointDescription: string;
};

export const emptyPartForm: NewPart = {
  partName: "",
  description: "",
  category: "",
  manufacturer: "",
  price: "",
  supplierNumber: "",

  imageUrl: "",
  imageDescription: "",

  sharepointUrl: "",
  sharepointDescription: "",
};

export const CATEGORY_HISTORY_KEY =
  "parts_category_history";

export const MANUFACTURER_HISTORY_KEY =
  "parts_manufacturer_history";

/* ==========================================================
   COMPONENT
========================================================== */
