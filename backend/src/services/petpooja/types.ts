export interface PetpoojaCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  cookie?: string;
}

// ---------- Sales / Orders API (generic_get_orders) ----------
// Real response shape confirmed by a live call: { code, success, message, order_json: [...] }
// — NOT the flat `orders`/`data` array assumed from the docs summary alone.

export interface PetpoojaOrderItem {
  categoryid?: string;
  categoryname?: string;
  name?: string;
  itemid?: string;
  price?: string | number;
  quantity?: string | number;
  total?: string | number;
  total_discount?: string | number;
  total_tax?: string | number;
  [key: string]: unknown;
}

export interface PetpoojaOrderRecord {
  Restaurant?: { restaurantid?: string; res_name?: string; restID?: string };
  Customer?: { name?: string; phone?: string };
  Order: {
    orderID: string;
    refId?: string;
    order_type?: string;
    payment_type?: string;
    discount_total?: string | number;
    tax_total?: string | number;
    core_total?: string | number;
    total?: string | number;
    created_on?: string;
    order_date?: string;
    status?: string;
    [key: string]: unknown;
  };
  Tax?: Array<{ title?: string; amount?: string | number }>;
  Discount?: unknown[];
  OrderItem: PetpoojaOrderItem[];
}

export interface PetpoojaOrdersResponse {
  code?: string;
  success?: string | boolean;
  message?: string;
  order_json?: PetpoojaOrderRecord[];
}

// ---------- Purchase API (get_purchase) ----------
// Real response shape: { code, success, message, restID, purchases: [] | "" }
// `purchases` records also cover internal inventory transfers — see mapper for
// the is_transfer_only / receiver_type discriminator confirmed by a live call.

export interface PetpoojaPurchaseItem {
  itemname?: string;
  qty?: string | number;
  price?: string | number;
  amount?: string | number;
  discount?: string | number;
  lbl_unit?: string;
  tax1_label?: string;
  tax2_label?: string;
  tax3_label?: string;
  tax1_amount?: string | number;
  tax2_amount?: string | number;
  tax3_amount?: string | number;
  [key: string]: unknown;
}

export interface PetpoojaPurchaseParty {
  sender_name?: string;
  sender_contact?: string;
  receiver_name?: string;
  receiver_contact?: string;
  receiver_gst?: string;
  receiver_type?: string;
}

export interface PetpoojaPurchaseRecord {
  purchase_id: string;
  type?: string;
  invoice_number?: string;
  invoice_date?: string;
  total?: string | number;
  total_tax?: string | number;
  action_status?: string;
  payment?: string;
  created_on?: string;
  receiver_id?: string;
  receiver_type?: string;
  restaurant_details?: {
    sender?: PetpoojaPurchaseParty;
    receiver?: PetpoojaPurchaseParty;
    is_transfer_only?: string;
  };
  item_details?: PetpoojaPurchaseItem[];
  [key: string]: unknown;
}

export interface PetpoojaPurchaseResponse {
  code?: string;
  success?: string | boolean;
  message?: string;
  restID?: string;
  purchases?: PetpoojaPurchaseRecord[] | '';
}
