import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Catálogo global — debe declararse antes de `companies` y `plan_features`. */
export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("HNL"),
  is_active: boolean("is_active").notNull().default(true),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const features = pgTable("features", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  name: text("name").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  plan_id: uuid("plan_id")
    .notNull()
    .references(() => plans.id),
  tax_id: text("tax_id"),
  auth_code: text("auth_code"),
  range_start: text("range_start"),
  range_end: text("range_end"),
  expiration_date: date("expiration_date"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const plan_features = pgTable(
  "plan_features",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plan_id: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    feature_id: uuid("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    sort_order: integer("sort_order").notNull().default(0),
  },
  (t) => [
    unique("plan_features_plan_id_feature_id_unique").on(t.plan_id, t.feature_id),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    company_id: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("memberships_user_id_company_id_unique").on(t.user_id, t.company_id),
  ],
);

/** Traducciones UI / nombres de columnas (locale + namespace + key únicos). */
export const translations = pgTable(
  "translations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locale: text("locale").notNull().default("es"),
    namespace: text("namespace").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("translations_locale_namespace_key_unique").on(
      t.locale,
      t.namespace,
      t.key,
    ),
  ],
);

/** Clientes del negocio por empresa (multi-tenant). */
export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rtn: text("rtn"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  notes: text("notes"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Compras registradas por empresa. */
export const purchases = pgTable("purchases", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  reference: text("reference"),
  supplier_name: text("supplier_name"),
  purchase_date: date("purchase_date"),
  total_amount: numeric("total_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  currency: text("currency").notNull().default("HNL"),
  notes: text("notes"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Unidades de medida (catálogo global).
 * Ej. PCS, KG, LB, CAJA.
 */
export const unitsOfMeasure = pgTable("units_of_measure", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Categorías de producto por empresa. */
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug"),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Producto / artículo de inventario por empresa. */
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    company_id: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    sku: text("sku"),
    barcode: text("barcode"),
    name: text("name").notNull(),
    category_id: uuid("category_id").references(() => productCategories.id, {
      onDelete: "set null",
    }),
    unit_id: uuid("unit_id").references(() => unitsOfMeasure.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    price: numeric("price", { precision: 14, scale: 2 }).notNull().default("0"),
    cost_price: numeric("cost_price", { precision: 14, scale: 2 }),
    currency: text("currency").notNull().default("HNL"),
    tax_rate: numeric("tax_rate", { precision: 5, scale: 2 }),
    stock_quantity: integer("stock_quantity").notNull().default(0),
    /** Catálogo web / tienda pública. */
    show_in_web_catalog: boolean("show_in_web_catalog").notNull().default(true),
    has_variants: boolean("has_variants").notNull().default(false),
    /** Etiqueta del tipo de variante (ej. Color, Talla). */
    variant_type_label: text("variant_type_label"),
    /** new | pre_order | post_exhibit | used */
    product_condition: text("product_condition").notNull().default("new"),
    /** required | optional | none */
    shipping_insurance: text("shipping_insurance").notNull().default("optional"),
    is_active: boolean("is_active").notNull().default(true),
    internal_notes: text("internal_notes"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("products_company_sku_unique").on(t.company_id, t.sku)],
);

/** Hasta 3 imágenes por producto (URLs; subida de archivos aparte). */
export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sort_order: integer("sort_order").notNull(),
    alt_text: text("alt_text"),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("product_images_product_sort_unique").on(t.product_id, t.sort_order)],
);

/** Valores de variante por producto (ej. Rojo, Azul si el tipo es Color). */
export const productVariantValues = pgTable(
  "product_variant_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("product_variant_values_product_name_unique").on(t.product_id, t.name),
  ],
);

/** Venta / factura POS por empresa. */
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  client_id: uuid("client_id").references(() => clients.id, {
    onDelete: "set null",
  }),
  sale_date: date("sale_date").notNull(),
  /** paid | credit */
  status: text("status").notNull().default("paid"),
  currency: text("currency").notNull().default("HNL"),
  subtotal_amount: numeric("subtotal_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  discount_amount: numeric("discount_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  tax_amount: numeric("tax_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  total_amount: numeric("total_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  /** cash | card | transfer | other */
  payment_method: text("payment_method"),
  installments: integer("installments"),
  /** Fecha tentativa de pago (ventas a crédito). */
  credit_due_date: date("credit_due_date"),
  invoice_number: text("invoice_number"),
  notes: text("notes"),
  created_by_user_id: uuid("created_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Líneas de detalle de factura (snapshot de producto al momento de la venta). */
export const invoiceLines = pgTable(
  "invoice_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoice_id: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    line_number: integer("line_number").notNull(),
    product_id: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    product_name: text("product_name").notNull(),
    sku: text("sku"),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
    unit_price: numeric("unit_price", { precision: 14, scale: 4 }).notNull(),
    line_total: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("invoice_lines_invoice_line_unique").on(t.invoice_id, t.line_number),
  ],
);

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Plan = InferSelectModel<typeof plans>;
export type NewPlan = InferInsertModel<typeof plans>;

export type Feature = InferSelectModel<typeof features>;
export type NewFeature = InferInsertModel<typeof features>;

export type PlanFeature = InferSelectModel<typeof plan_features>;
export type NewPlanFeature = InferInsertModel<typeof plan_features>;

export type Company = InferSelectModel<typeof companies>;
export type NewCompany = InferInsertModel<typeof companies>;

export type Membership = InferSelectModel<typeof memberships>;
export type NewMembership = InferInsertModel<typeof memberships>;

export type Translation = InferSelectModel<typeof translations>;
export type NewTranslation = InferInsertModel<typeof translations>;

export type Client = InferSelectModel<typeof clients>;
export type NewClient = InferInsertModel<typeof clients>;

export type Purchase = InferSelectModel<typeof purchases>;
export type NewPurchase = InferInsertModel<typeof purchases>;

export type UnitOfMeasure = InferSelectModel<typeof unitsOfMeasure>;
export type NewUnitOfMeasure = InferInsertModel<typeof unitsOfMeasure>;

export type ProductCategory = InferSelectModel<typeof productCategories>;
export type NewProductCategory = InferInsertModel<typeof productCategories>;

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

export type ProductImage = InferSelectModel<typeof productImages>;
export type NewProductImage = InferInsertModel<typeof productImages>;

export type ProductVariantValue = InferSelectModel<typeof productVariantValues>;
export type NewProductVariantValue = InferInsertModel<
  typeof productVariantValues
>;

export type Invoice = InferSelectModel<typeof invoices>;
export type NewInvoice = InferInsertModel<typeof invoices>;

export type InvoiceLine = InferSelectModel<typeof invoiceLines>;
export type NewInvoiceLine = InferInsertModel<typeof invoiceLines>;
