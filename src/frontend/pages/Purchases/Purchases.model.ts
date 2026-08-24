export type Purchase = {
  id: number;
  partNumber: string;
  vendor: string;
  poNumber: string;
  quantity: number;
  unitCost: number;
  orderDate: string;
  receiveDate: string;
  invoiceNumber: string;
};

export type PurchaseForm = {
  partNumber: string;
  vendor: string;
  poNumber: string;
  quantity: string;
  unitCost: string;
  orderDate: string;
  receiveDate: string;
  invoiceNumber: string;
};

export const emptyForm: PurchaseForm = {
  partNumber: "",
  vendor: "",
  poNumber: "",
  quantity: "1",
  unitCost: "",
  orderDate: "",
  receiveDate: "",
  invoiceNumber: "",
};
