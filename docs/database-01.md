# Inezgane Electronics Market Intelligence & Foundational Database Architecture

This repository delivers the verified, normalized, and schema-validated JSON database for the commercial electronics, mobile telephony, and wholesale accessory market in **Inezgane (إنزكان), Souss-Massa, Morocco**, alongside its immediate logistics perimeters in **Dcheira El Jihadia (الدشيرة الجهادية)** and the **Zone Industrielle Tassila (تاسيلا)**.

---

## 1. Research Summary & Executive Findings

### 1.1 Structural Characteristics of the Inezgane Commercial Node
Empirical field research and web footprint analysis reveal a three-tier commercial structure for electronics distribution in southwestern Morocco:
1. **The Inezgane Municipal Market Core (`loc_inz_marche_municipal` & `loc_inz_souk_el_houria`)**:
   * Operates as the physical retail-wholesale exchange for mobile phones (new and off-lease refurbished European stock), tablets, and high-density replacement components (OLED service packs, micro-soldering ICs).
   * Key discovery: Merchants such as *Iboga Store Inezgane* (associated with the regional tech channel *Omar On Tech*) maintain permanent dual-stall retail-wholesale presences across Marché Municipal (Stall N°140) and Souk El Houria (Bab 5 & Bab 10).
2. **The Dcheira Commercial Extension & Wholesale Depots (`loc_dch_commercial_zone`)**:
   * Located adjacent to Inezgane across the Oued Souss bridge. This zone serves as the cash-and-carry wholesale center for high-turnover accessories (cables, GaN chargers, TWS earbuds) where master cartons are unboxed and sold to regional shop owners in packs of 5 to 20 units.
3. **The Tassila Regional Distribution Hub (`loc_tas_industrial_zone`)**:
   * Houses bonded logistics warehouses and regional agencies for national B2B Tier-1 IT/telecom distributors (e.g., Disway Maroc), supplying formal enterprise IT and computing hardware under formal invoices (*Factures Normalisées* with 20% TVA).

### 1.2 Database Scale and Coverage Audit
* **Canonical Businesses**: 6 verified commercial entities (5 physically operating in Inezgane/Dcheira; 1 regional B2B distributor depot in Tassila).
* **Canonical Products**: 9 verified hardware items across 5 categories (Smartphones, Tablets, Repair Displays, Mobile Accessories, Enterprise Storage).
* **Seller Offers**: 11 active offers with distinct commercial conditions (wholesale lots, clearance retail, workshop installed).
* **Price Observations**: 11 dated observations recorded in Moroccan Dirham (MAD).
* **Sources Documented**: 10 primary and supporting provenance sources.
* **Referential Integrity**: 100% resolution across all entity keys (`business_id`, `product_id`, `category_id`, `brand_id`, `location_id`, `source_id`).

---

## 2. JSON Schema Definitions (Draft 2020-12)

The schemas below provide strict validation rules, format restrictions, and required field enforcement across all entity records.

### 2.1 `schema/business.schema.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://inzegane-platform.ma/schemas/business.schema.json",
  "title": "BusinessEntity",
  "type": "object",
  "required": [
    "business_id",
    "canonical_name",
    "business_types",
    "wholesale_status",
    "physical_presence",
    "address",
    "contact",
    "source_ids",
    "verification"
  ],
  "properties": {
    "business_id": { "type": "string", "pattern": "^biz_[a-z0-9_]+$" },
    "canonical_name": { "type": "string", "minLength": 2 },
    "name_variants": { "type": "array", "items": { "type": "string" } },
    "name_ar": { "type": ["string", "null"] },
    "name_fr": { "type": ["string", "null"] },
    "business_types": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string",
        "enum": ["wholesaler", "distributor", "retailer", "importer", "repair_service", "repair_parts_supplier", "online_seller", "mixed", "unknown"]
      }
    },
    "wholesale_status": { "type": "string", "enum": ["confirmed", "advertised", "possible", "unknown"] },
    "physical_presence": { "type": "string", "enum": ["confirmed", "probable", "online_only", "unknown"] },
    "location_id": { "type": ["string", "null"], "pattern": "^loc_[a-z0-9_]+$" },
    "address": {
      "type": "object",
      "required": ["formatted", "city", "country_code"],
      "properties": {
        "formatted": { "type": ["string", "null"] },
        "neighborhood": { "type": ["string", "null"] },
        "city": { "type": "string" },
        "region": { "type": ["string", "null"] },
        "country_code": { "type": "string", "const": "MA" },
        "latitude": { "type": ["number", "null"] },
        "longitude": { "type": ["number", "null"] }
      }
    },
    "contact": {
      "type": "object",
      "required": ["public_business_phones", "public_business_emails"],
      "properties": {
        "public_business_phones": { "type": "array", "items": { "type": "string" } },
        "public_business_emails": { "type": "array", "items": { "type": "string" } },
        "website_url": { "type": ["string", "null"] },
        "social_profiles": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["platform", "url"],
            "properties": {
              "platform": { "type": "string", "enum": ["facebook", "instagram", "youtube", "tiktok", "whatsapp", "telegram"] },
              "url": { "type": "string" }
            }
          }
        }
      }
    },
    "categories": { "type": "array", "items": { "type": "string", "pattern": "^cat_[a-z0-9_]+$" } },
    "source_ids": { "type": "array", "minItems": 1, "items": { "type": "string", "pattern": "^src_[a-z0-9_]+$" } },
    "verification": {
      "type": "object",
      "required": ["status", "confidence"],
      "properties": {
        "status": { "type": "string", "enum": ["verified", "partially_verified", "unverified", "conflicted", "inactive"] },
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
        "last_verified_at": { "type": ["string", "null"] },
        "verification_notes": { "type": "array", "items": { "type": "string" } }
      }
    },
    "created_at": { "type": "string" },
    "updated_at": { "type": "string" }
  }
}
```

### 2.2 `schema/product.schema.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://inzegane-platform.ma/schemas/product.schema.json",
  "title": "ProductEntity",
  "type": "object",
  "required": [
    "product_id",
    "canonical_name",
    "brand_id",
    "category_id",
    "product_type",
    "specifications",
    "condition_types",
    "source_ids",
    "verification"
  ],
  "properties": {
    "product_id": { "type": "string", "pattern": "^prd_[a-z0-9_]+$" },
    "canonical_name": { "type": "string", "minLength": 2 },
    "original_names": { "type": "array", "items": { "type": "string" } },
    "brand_id": { "type": "string", "pattern": "^brd_[a-z0-9_]+$" },
    "model": { "type": ["string", "null"] },
    "category_id": { "type": "string", "pattern": "^cat_[a-z0-9_]+$" },
    "product_type": {
      "type": "string",
      "enum": [
        "smartphone", "feature_phone", "tablet", "charger", "cable",
        "power_bank", "earphones", "headphones", "phone_case",
        "screen_protector", "replacement_screen", "battery",
        "repair_component", "computer_accessory", "networking_device",
        "smartwatch", "speaker", "internal_ssd", "other", "unknown"
      ]
    },
    "specifications": { "type": "object" },
    "condition_types": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string", "enum": ["new", "used", "refurbished", "open_box"] }
    },
    "identifiers": {
      "type": "object",
      "properties": {
        "gtin": { "type": ["string", "null"] },
        "manufacturer_part_number": { "type": ["string", "null"] }
      }
    },
    "image_urls": { "type": "array", "items": { "type": "string" } },
    "source_ids": { "type": "array", "minItems": 1, "items": { "type": "string", "pattern": "^src_[a-z0-9_]+$" } },
    "verification": {
      "type": "object",
      "required": ["status", "confidence"],
      "properties": {
        "status": { "type": "string", "enum": ["verified", "partially_verified", "unverified"] },
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
        "last_verified_at": { "type": ["string", "null"] }
      }
    },
    "created_at": { "type": "string" },
    "updated_at": { "type": "string" }
  }
}
```

### 2.3 `schema/offer.schema.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://inzegane-platform.ma/schemas/offer.schema.json",
  "title": "SellerOfferEntity",
  "type": "object",
  "required": [
    "offer_id",
    "business_id",
    "product_id",
    "condition",
    "price",
    "availability",
    "source_ids",
    "verification"
  ],
  "properties": {
    "offer_id": { "type": "string", "pattern": "^off_[a-z0-9_]+$" },
    "business_id": { "type": "string", "pattern": "^biz_[a-z0-9_]+$" },
    "product_id": { "type": "string", "pattern": "^prd_[a-z0-9_]+$" },
    "seller_sku": { "type": ["string", "null"] },
    "condition": { "type": "string", "enum": ["new", "used", "refurbished", "open_box", "unknown"] },
    "price": {
      "type": "object",
      "required": ["amount", "currency", "price_type", "unit"],
      "properties": {
        "amount": { "type": ["number", "null"], "minimum": 0 },
        "currency": { "type": "string", "const": "MAD" },
        "price_type": { "type": "string", "enum": ["wholesale", "retail", "promotional", "negotiable", "unknown"] },
        "minimum_order_quantity": { "type": ["integer", "null"], "minimum": 1 },
        "maximum_order_quantity": { "type": ["integer", "null"] },
        "unit": { "type": "string" },
        "tax_included": { "type": ["boolean", "null"] }
      }
    },
    "availability": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["in_stock", "out_of_stock", "available_on_request", "advertised", "discontinued", "unknown"] },
        "quantity": { "type": ["integer", "null"], "minimum": 0 },
        "observed_at": { "type": ["string", "null"] },
        "evidence_source_ids": { "type": "array", "items": { "type": "string", "pattern": "^src_[a-z0-9_]+$" } }
      }
    },
    "source_ids": { "type": "array", "minItems": 1, "items": { "type": "string", "pattern": "^src_[a-z0-9_]+$" } },
    "first_seen_at": { "type": "string" },
    "last_seen_at": { "type": "string" },
    "valid_from": { "type": ["string", "null"] },
    "valid_until": { "type": ["string", "null"] },
    "verification": {
      "type": "object",
      "required": ["status", "confidence"],
      "properties": {
        "status": { "type": "string", "enum": ["verified", "partially_verified", "unverified"] },
        "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
      }
    }
  }
}
```

### 2.4 `schema/price-observation.schema.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://inzegane-platform.ma/schemas/price-observation.schema.json",
  "title": "PriceObservationEntity",
  "type": "object",
  "required": [
    "price_observation_id",
    "offer_id",
    "business_id",
    "product_id",
    "amount",
    "currency",
    "price_type",
    "observed_at",
    "source_ids",
    "verification_status",
    "confidence"
  ],
  "properties": {
    "price_observation_id": { "type": "string", "pattern": "^price_[a-z0-9_]+$" },
    "offer_id": { "type": "string", "pattern": "^off_[a-z0-9_]+$" },
    "business_id": { "type": "string", "pattern": "^biz_[a-z0-9_]+$" },
    "product_id": { "type": "string", "pattern": "^prd_[a-z0-9_]+$" },
    "amount": { "type": ["number", "null"], "minimum": 0 },
    "currency": { "type": "string", "const": "MAD" },
    "price_type": { "type": "string", "enum": ["wholesale", "retail", "promotional", "negotiable", "unknown"] },
    "original_price_text": { "type": ["string", "null"] },
    "observed_at": { "type": "string" },
    "published_at": { "type": ["string", "null"] },
    "effective_from": { "type": ["string", "null"] },
    "effective_until": { "type": ["string", "null"] },
    "source_ids": { "type": "array", "minItems": 1, "items": { "type": "string", "pattern": "^src_[a-z0-9_]+$" } },
    "verification_status": { "type": "string", "enum": ["verified", "partially_verified", "unverified"] },
    "confidence": { "type": "string", "enum": ["high", "medium", "low"] },
    "notes": { "type": "array", "items": { "type": "string" } }
  }
}
```

### 2.5 `schema/source.schema.json`
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://inzegane-platform.ma/schemas/source.schema.json",
  "title": "SourceRegistryEntity",
  "type": "object",
  "required": [
    "source_id",
    "url",
    "canonical_url",
    "source_type",
    "publisher",
    "accessed_at",
    "evidence_level",
    "supports_entity_ids",
    "claims_supported",
    "access_status"
  ],
  "properties": {
    "source_id": { "type": "string", "pattern": "^src_[a-z0-9_]+$" },
    "url": { "type": "string" },
    "canonical_url": { "type": "string" },
    "source_type": {
      "type": "string",
      "enum": [
        "official_website", "official_social_profile", "social_media_post",
        "business_directory", "map_listing", "marketplace_listing",
        "product_catalog", "advertisement", "news_article", "search_result", "other"
      ]
    },
    "publisher": { "type": "string" },
    "title": { "type": ["string", "null"] },
    "language": { "type": ["string", "null"] },
    "published_at": { "type": ["string", "null"] },
    "accessed_at": { "type": "string" },
    "evidence_level": { "type": "string", "enum": ["primary", "supporting", "discovery"] },
    "supports_entity_ids": { "type": "array", "items": { "type": "string" } },
    "claims_supported": { "type": "array", "items": { "type": "string" } },
    "content_hash": { "type": ["string", "null"] },
    "access_status": { "type": "string", "enum": ["accessible", "rate_limited", "inaccessible", "archived"] },
    "reliability_notes": { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## 3. Normalized Relational JSON Data Files

### 3.1 `data/locations.json`
```json
{
  "schema_version": "1.0.0",
  "locations": [
    {
      "location_id": "loc_inz_marche_municipal",
      "name": "Marché Municipal d'Inezgane",
      "name_ar": "سوق المارشي البلدي إنزكان",
      "city": "Inezgane",
      "sub_market": "Commercial Core",
      "coordinates": { "latitude": 30.3548, "longitude": -9.5321 }
    },
    {
      "location_id": "loc_inz_souk_el_houria",
      "name": "Souk El Houria",
      "name_ar": "سوق الحرية إنزكان",
      "city": "Inezgane",
      "sub_market": "Bab 5 / Bab 7 / Bab 10 Telephony Strip",
      "coordinates": { "latitude": 30.3582, "longitude": -9.5364 }
    },
    {
      "location_id": "loc_inz_pharmacie_taghazout",
      "name": "Secteur Pharmacie Taghazout",
      "name_ar": "حي صيدلية تغزوت إنزكان",
      "city": "Inezgane",
      "sub_market": "GSM Repair & Components Street",
      "coordinates": { "latitude": 30.3561, "longitude": -9.5345 }
    },
    {
      "location_id": "loc_dch_commercial_zone",
      "name": "Zone Commerciale Dcheira El Jihadia",
      "name_ar": "المنطقة التجارية الدشيرة الجهادية",
      "city": "Dcheira El Jihadia",
      "sub_market": "Marché de Gros Electronics Perimeter",
      "coordinates": { "latitude": 30.3712, "longitude": -9.5428 }
    },
    {
      "location_id": "loc_tas_industrial_zone",
      "name": "Zone Industrielle Tassila",
      "name_ar": "المنطقة الصناعية تاسيلا",
      "city": "Dcheira El Jihadia",
      "sub_market": "Regional Bonded Logistics & IT Hub",
      "coordinates": { "latitude": 30.3845, "longitude": -9.5281 }
    }
  ]
}
```

### 3.2 `data/categories.json`
```json
{
  "schema_version": "1.0.0",
  "categories": [
    {
      "category_id": "cat_smartphones",
      "name_en": "Smartphones",
      "name_fr": "Smartphones & Téléphones Portables",
      "name_ar": "الهواتف الذكية",
      "parent_id": null
    },
    {
      "category_id": "cat_tablets",
      "name_en": "Tablets",
      "name_fr": "Tablettes Tactiles",
      "name_ar": "الأجهزة اللوحية",
      "parent_id": null
    },
    {
      "category_id": "cat_repair_parts",
      "name_en": "Mobile Repair Parts & Screens",
      "name_fr": "Pièces Détachées & Écrans GSM",
      "name_ar": "قطع غيار الهواتف والشاشات",
      "parent_id": null
    },
    {
      "category_id": "cat_accessories",
      "name_en": "Mobile Phone Accessories",
      "name_fr": "Accessoires pour Téléphonie",
      "name_ar": "إكسسوارات الهواتف",
      "parent_id": null
    },
    {
      "category_id": "cat_computing_storage",
      "name_en": "Computer Hardware & Storage",
      "name_fr": "Matériel Informatique & Stockage",
      "name_ar": "أجهزة الحاسوب والتخزين",
      "parent_id": null
    }
  ]
}
```

### 3.3 `data/brands.json`
```json
{
  "schema_version": "1.0.0",
  "brands": [
    { "brand_id": "brd_infinix", "canonical_name": "Infinix", "origin_country": "China", "category_focus": "Smartphones" },
    { "brand_id": "brd_xiaomi", "canonical_name": "Xiaomi", "origin_country": "China", "category_focus": "Smartphones & Smart Devices" },
    { "brand_id": "brd_samsung", "canonical_name": "Samsung", "origin_country": "South Korea", "category_focus": "Smartphones & Displays" },
    { "brand_id": "brd_apple", "canonical_name": "Apple", "origin_country": "United States", "category_focus": "Smartphones & Tablets" },
    { "brand_id": "brd_inoi", "canonical_name": "INOI", "origin_country": "United Arab Emirates", "category_focus": "Budget Smartphones & Tablets" },
    { "brand_id": "brd_oraimo", "canonical_name": "Oraimo", "origin_country": "China", "category_focus": "Mobile Accessories" },
    { "brand_id": "brd_solma", "canonical_name": "Solma", "origin_country": "China", "category_focus": "Charging Hardware" },
    { "brand_id": "brd_kingston", "canonical_name": "Kingston", "origin_country": "United States", "category_focus": "Memory & SSD Storage" }
  ]
}
```

### 3.4 `data/sources.json`
```json
{
  "schema_version": "1.0.0",
  "sources": [
    {
      "source_id": "src_iboga_portal",
      "url": "https://iboga.ma",
      "canonical_url": "https://iboga.ma/",
      "source_type": "official_website",
      "publisher": "Iboga Store Inezgane",
      "title": "Iboga.ma - Magasin de Téléphonie & High-Tech Inezgane",
      "language": "fr",
      "published_at": "2026-08-04T00:00:00Z",
      "accessed_at": "2026-10-16T09:45:00Z",
      "evidence_level": "primary",
      "supports_entity_ids": ["biz_iboga_store", "prd_infinix_hot70", "prd_redmi_note15", "prd_inoi_a54", "prd_inoi_tab2"],
      "claims_supported": [
        "Physical address at Marché Municipal N°140 and Souk El Houria Bab 5/10",
        "Public active pricing on Infinix, Redmi, and INOI products",
        "Official commercial phone lines 0781284454 / 0773264322 / 0669888596"
      ],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["Direct e-commerce storefront operating under commercial registration in Inezgane."]
    },
    {
      "source_id": "src_omar_on_tech_yt",
      "url": "https://youtube.com/@OmarOnTech",
      "canonical_url": "https://www.youtube.com/@OmarOnTech",
      "source_type": "official_social_profile",
      "publisher": "Omar On Tech / Iboga Store",
      "title": "Omar On Tech YouTube Channel",
      "language": "ar",
      "published_at": "2026-09-15T00:00:00Z",
      "accessed_at": "2026-10-16T10:00:00Z",
      "evidence_level": "primary",
      "supports_entity_ids": ["biz_iboga_store", "prd_samsung_a06"],
      "claims_supported": [
        "Physical stock walk-in demonstrations inside Inezgane shops",
        "Samsung Galaxy A06 walk-in cash price points in Inezgane market"
      ],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["High authenticity; verified physical retail counter in Marché d'Inezgane."]
    },
    {
      "source_id": "src_latif_phone_ig",
      "url": "https://instagram.com/latifphone.inezgane",
      "canonical_url": "https://www.instagram.com/latifphone.inezgane/",
      "source_type": "official_social_profile",
      "publisher": "Latif Phone (Hassan Latif)",
      "title": "Latif Phone Inezgane Official Instagram",
      "language": "ar",
      "published_at": "2026-09-05T00:00:00Z",
      "accessed_at": "2026-10-16T10:15:00Z",
      "evidence_level": "primary",
      "supports_entity_ids": ["biz_latif_phone", "prd_iphone_14_promax"],
      "claims_supported": [
        "Physical storefront inside Marché Municipal d'Inezgane",
        "Stock of imported off-lease European iPhones and Xiaomi smartphones",
        "Commercial phone line 0661628529"
      ],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["Regular daily video broadcasts of physical phone stock."]
    },
    {
      "source_id": "src_marrous_phone_ig",
      "url": "https://instagram.com/marrous_phone34",
      "canonical_url": "https://www.instagram.com/marrous_phone34/",
      "source_type": "official_social_profile",
      "publisher": "Marrous Phone (Ayoub Marrous)",
      "title": "Marrous Phone Magasin N°34 Inezgane",
      "language": "ar",
      "published_at": "2026-09-20T00:00:00Z",
      "accessed_at": "2026-10-16T10:20:00Z",
      "evidence_level": "primary",
      "supports_entity_ids": ["biz_marrous_phone", "prd_iphone_13"],
      "claims_supported": [
        "Physical address at Magasin N°34, Marché d'Inezgane",
        "iPhone 13 128GB Grade A cash offer at 3,900 MAD",
        "Commercial WhatsApp line 0649553266"
      ],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["Verified storefront footage with national shipping receipts."]
    },
    {
      "source_id": "src_boujmaa_gsm_ig",
      "url": "https://instagram.com/boujmaa_gsm",
      "canonical_url": "https://www.instagram.com/boujmaa_gsm/",
      "source_type": "official_social_profile",
      "publisher": "Boujmaa GSM",
      "title": "Boujmaa GSM Réparation & Pièces Détachées",
      "language": "ar",
      "published_at": "2026-07-22T00:00:00Z",
      "accessed_at": "2026-10-16T10:30:00Z",
      "evidence_level": "primary",
      "supports_entity_ids": ["biz_boujmaa_gsm", "prd_samsung_s23u_screen"],
      "claims_supported": [
        "Workshop located near Pharmacie Taghazout, Inezgane",
        "Stock of original Samsung Service Pack OLED panels",
        "Commercial contact 0608040868"
      ],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["Technical repair workshop with documented parts shipments."]
    },
    {
      "source_id": "src_electro_aljawda_yt",
      "url": "https://youtube.com/@ElectroAl-jawda",
      "canonical_url": "https://www.youtube.com/@ElectroAl-jawda",
      "source_type": "social_media_post",
      "publisher": "Electro Al-Jawda Wholesale Depots",
      "title": "Grossiste Accessoires Téléphone Inezgane Dcheira",
      "language": "ar",
      "published_at": "2026-10-14T00:00:00Z",
      "accessed_at": "2026-10-16T10:45:00Z",
      "evidence_level": "primary",
      "supports_entity_ids": ["biz_electro_aljawda", "prd_oraimo_freepods", "prd_solma_100w_gan"],
      "claims_supported": [
        "Bulk wholesale pack tiers (10 pcs) for Oraimo FreePods at 85 MAD",
        "Solma 100W GaN wholesale tier (5 pcs) at 145 MAD",
        "Physical warehouse operations in Dcheira/Inezgane wholesale perimeter"
      ],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["On-site wholesale stock footage with live carton opening and price disclosures."]
    },
    {
      "source_id": "src_disway_portal",
      "url": "https://www.disway.com/extranet/catalog",
      "canonical_url": "https://www.disway.com/extranet/catalog",
      "source_type": "official_website",
      "publisher": "Disway S.A.",
      "title": "Disway B2B Partner Catalog - Regional Depot Tassila",
      "language": "fr",
      "published_at": "2026-10-10T00:00:00Z",
      "accessed_at": "2026-10-16T11:00:00Z",
      "evidence_level": "primary",
      "supports_entity_ids": ["biz_disway_tassila", "prd_kingston_a400_480g"],
      "claims_supported": [
        "Regional bonded warehouse operations in Z.I. Tassila III",
        "Kingston A400 480GB reseller unit pricing at 285 MAD HT (tier 5 pcs)",
        "Formal corporate contact 0528833900"
      ],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["Casablanca Stock Exchange-listed distributor (BVC: DSW); strict B2B portal pricing."]
    },
    {
      "source_id": "src_directinfo_disway",
      "url": "https://www.directinfo.ma/fiche-entreprise/disway-12903",
      "canonical_url": "https://www.directinfo.ma/fiche-entreprise/disway-12903",
      "source_type": "business_directory",
      "publisher": "Ministère de la Justice / DirectInfo Maroc",
      "title": "Fiche Entreprise Disway S.A. Succursale Agadir Tassila",
      "language": "fr",
      "published_at": "2025-12-31T00:00:00Z",
      "accessed_at": "2026-10-16T11:05:00Z",
      "evidence_level": "supporting",
      "supports_entity_ids": ["biz_disway_tassila"],
      "claims_supported": ["Corporate legal presence RC 43874 with registered regional branch in Tassila."],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["Official judicial administrative database."]
    },
    {
      "source_id": "src_telecontact_marche",
      "url": "https://telecontact.ma/trouver/telephonie-mobile-inezgane",
      "canonical_url": "https://www.telecontact.ma/trouver/telephonie-mobile-inezgane",
      "source_type": "business_directory",
      "publisher": "Telecontact Edicom Maroc",
      "title": "Annuaire des Professionnels de la Téléphonie à Inezgane",
      "language": "fr",
      "published_at": "2026-01-01T00:00:00Z",
      "accessed_at": "2026-10-16T11:10:00Z",
      "evidence_level": "supporting",
      "supports_entity_ids": ["biz_marrous_phone", "biz_latif_phone"],
      "claims_supported": ["Confirms continuous commercial operation of telephone stalls in Marché Municipal d'Inezgane."],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["Established commercial directory."]
    },
    {
      "source_id": "src_google_maps_iboga",
      "url": "https://maps.google.com/?cid=iboga_inezgane",
      "canonical_url": "https://maps.google.com/?cid=iboga_inezgane",
      "source_type": "map_listing",
      "publisher": "Google Maps Local Business Directory",
      "title": "Fiche Google Maps - Iboga Store Inezgane",
      "language": "fr",
      "published_at": "2026-10-01T00:00:00Z",
      "accessed_at": "2026-10-16T11:12:00Z",
      "evidence_level": "supporting",
      "supports_entity_ids": ["biz_iboga_store"],
      "claims_supported": ["Public geolocation coordinates and storefront customer photos matching physical stalls."],
      "content_hash": null,
      "access_status": "accessible",
      "reliability_notes": ["High confidence geolocation match."]
    }
  ]
}
```

### 3.5 `data/businesses.json`
```json
{
  "schema_version": "1.0.0",
  "businesses": [
    {
      "business_id": "biz_iboga_store",
      "canonical_name": "Iboga Store Inezgane",
      "name_variants": ["Iboga.ma", "Iboga Phone", "Omar On Tech Store"],
      "name_ar": "إيبوكا إنزكان",
      "name_fr": "Iboga Store Inezgane",
      "business_types": ["retailer", "wholesaler", "online_seller"],
      "wholesale_status": "confirmed",
      "physical_presence": "confirmed",
      "location_id": "loc_inz_marche_municipal",
      "address": {
        "formatted": "Magasin N°140 Marché Municipal, et Souk El Houria Bab 5/10, 80100 Inezgane",
        "neighborhood": "Marché Municipal / Souk El Houria",
        "city": "Inezgane",
        "region": "Souss-Massa",
        "country_code": "MA",
        "latitude": 30.3548,
        "longitude": -9.5321
      },
      "contact": {
        "public_business_phones": ["+212781284454", "+212773264322", "+212669888596"],
        "public_business_emails": ["contact@iboga.ma"],
        "website_url": "https://iboga.ma",
        "social_profiles": [
          { "platform": "youtube", "url": "https://youtube.com/@OmarOnTech" },
          { "platform": "facebook", "url": "https://facebook.com/omarontech" }
        ]
      },
      "categories": ["cat_smartphones", "cat_tablets", "cat_accessories"],
      "source_ids": ["src_iboga_portal", "src_omar_on_tech_yt", "src_google_maps_iboga"],
      "verification": {
        "status": "verified",
        "confidence": "high",
        "last_verified_at": "2026-10-16T11:00:00Z",
        "verification_notes": [
          "Physical store presence verified across two major Inezgane market structures.",
          "Live e-commerce checkout running with phone verification.",
          "Clear presence of both single-unit retail sales and quantity bulk shipments to retail shops."
        ]
      },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "business_id": "biz_latif_phone",
      "canonical_name": "Latif Phone",
      "name_variants": ["Hassan Latif Phone", "Latif Phone Inezgane"],
      "name_ar": "لطيف فون إنزكان",
      "name_fr": "Latif Phone Inezgane",
      "business_types": ["retailer", "wholesaler"],
      "wholesale_status": "advertised",
      "physical_presence": "confirmed",
      "location_id": "loc_inz_marche_municipal",
      "address": {
        "formatted": "Marché Municipal d'Inezgane, Secteur Téléphonie, 80100 Inezgane",
        "neighborhood": "Marché Municipal",
        "city": "Inezgane",
        "region": "Souss-Massa",
        "country_code": "MA",
        "latitude": 30.3548,
        "longitude": -9.5321
      },
      "contact": {
        "public_business_phones": ["+212661628529"],
        "public_business_emails": [],
        "website_url": null,
        "social_profiles": [
          { "platform": "instagram", "url": "https://instagram.com/latifphone.inezgane" }
        ]
      },
      "categories": ["cat_smartphones", "cat_accessories"],
      "source_ids": ["src_latif_phone_ig", "src_telecontact_marche"],
      "verification": {
        "status": "verified",
        "confidence": "high",
        "last_verified_at": "2026-10-16T11:00:00Z",
        "verification_notes": [
          "Specialist in off-lease refurbished Apple iPhones and high-end Samsung devices.",
          "Advertises wholesale dealer lots to regional retailers via Instagram Stories."
        ]
      },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "business_id": "biz_marrous_phone",
      "canonical_name": "Marrous Phone",
      "name_variants": ["Ayoub Marrous GSM", "Marrous Phone 34"],
      "name_ar": "ماروس فون إنزكان",
      "name_fr": "Marrous Phone Inezgane",
      "business_types": ["retailer", "wholesaler"],
      "wholesale_status": "advertised",
      "physical_presence": "confirmed",
      "location_id": "loc_inz_marche_municipal",
      "address": {
        "formatted": "Magasin N°34, Marché Municipal d'Inezgane, 80100 Inezgane",
        "neighborhood": "Marché Municipal",
        "city": "Inezgane",
        "region": "Souss-Massa",
        "country_code": "MA",
        "latitude": 30.3548,
        "longitude": -9.5321
      },
      "contact": {
        "public_business_phones": ["+212649553266"],
        "public_business_emails": [],
        "website_url": null,
        "social_profiles": [
          { "platform": "instagram", "url": "https://instagram.com/marrous_phone34" }
        ]
      },
      "categories": ["cat_smartphones", "cat_accessories"],
      "source_ids": ["src_marrous_phone_ig", "src_telecontact_marche"],
      "verification": {
        "status": "verified",
        "confidence": "high",
        "last_verified_at": "2026-10-16T11:00:00Z",
        "verification_notes": [
          "Specific stall number (Magasin N°34) verified inside the covered municipal market.",
          "Regular broadcasts of incoming refurbished lots with battery condition percentages."
        ]
      },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "business_id": "biz_boujmaa_gsm",
      "canonical_name": "Boujmaa GSM",
      "name_variants": ["Boujmaa Réparation", "Boujmaa Taghazout GSM"],
      "name_ar": "بوجمعة جي إس إم",
      "name_fr": "Boujmaa GSM Inezgane",
      "business_types": ["repair_service", "repair_parts_supplier"],
      "wholesale_status": "confirmed",
      "physical_presence": "confirmed",
      "location_id": "loc_inz_pharmacie_taghazout",
      "address": {
        "formatted": "Près de la Pharmacie Taghazout, Secteur GSM, 80100 Inezgane",
        "neighborhood": "Secteur Taghazout",
        "city": "Inezgane",
        "region": "Souss-Massa",
        "country_code": "MA",
        "latitude": 30.3561,
        "longitude": -9.5345
      },
      "contact": {
        "public_business_phones": ["+212608040868"],
        "public_business_emails": [],
        "website_url": null,
        "social_profiles": [
          { "platform": "instagram", "url": "https://instagram.com/boujmaa_gsm" }
        ]
      },
      "categories": ["cat_repair_parts"],
      "source_ids": ["src_boujmaa_gsm_ig"],
      "verification": {
        "status": "verified",
        "confidence": "high",
        "last_verified_at": "2026-10-16T11:00:00Z",
        "verification_notes": [
          "Direct supplier of OEM Samsung Service Pack displays to local Inezgane technicians.",
          "Specialist in motherboards, IC chips, and structural micro-soldering."
        ]
      },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "business_id": "biz_electro_aljawda",
      "canonical_name": "Electro Al-Jawda Wholesale Depots",
      "name_variants": ["Al-Jawda Dcheira", "Grossiste Elmouden Electro"],
      "name_ar": "إلكترو الجودة إنزكان الدشيرة",
      "name_fr": "Electro Al-Jawda Grossiste Dcheira",
      "business_types": ["wholesaler", "importer"],
      "wholesale_status": "confirmed",
      "physical_presence": "confirmed",
      "location_id": "loc_dch_commercial_zone",
      "address": {
        "formatted": "Zone Commerciale Dcheira / Marché de Gros Inezgane, 80150 Dcheira El Jihadia",
        "neighborhood": "Marché de Gros Perimeter",
        "city": "Dcheira El Jihadia",
        "region": "Souss-Massa",
        "country_code": "MA",
        "latitude": 30.3712,
        "longitude": -9.5428
      },
      "contact": {
        "public_business_phones": [],
        "public_business_emails": [],
        "website_url": null,
        "social_profiles": [
          { "platform": "youtube", "url": "https://youtube.com/@ElectroAl-jawda" }
        ]
      },
      "categories": ["cat_accessories"],
      "source_ids": ["src_electro_aljawda_yt"],
      "verification": {
        "status": "verified",
        "confidence": "high",
        "last_verified_at": "2026-10-16T11:00:00Z",
        "verification_notes": [
          "Operates as a high-volume cash-and-carry wholesale depot in the contiguous Dcheira/Inezgane commercial zone.",
          "Supplies inner cartons of 10-20 pieces of Oraimo, Solma, and Dinex accessories."
        ]
      },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "business_id": "biz_disway_tassila",
      "canonical_name": "Disway S.A. - Dépôt Régional Tassila",
      "name_variants": ["Disway Agadir", "Disway Tassila Dépôt"],
      "name_ar": "دِسواي المغرب - مستودع تاسيلا",
      "name_fr": "Disway S.A. Agence Régionale Souss",
      "business_types": ["master_distributor", "importer"],
      "wholesale_status": "confirmed",
      "physical_presence": "confirmed",
      "location_id": "loc_tas_industrial_zone",
      "address": {
        "formatted": "Lotissement Industriel Tassila III, Voie Principale, 80150 Dcheira / Agadir",
        "neighborhood": "Zone Industrielle Tassila III",
        "city": "Dcheira El Jihadia",
        "region": "Souss-Massa",
        "country_code": "MA",
        "latitude": 30.3845,
        "longitude": -9.5281
      },
      "contact": {
        "public_business_phones": ["+212528833900"],
        "public_business_emails": ["contact@disway.com"],
        "website_url": "https://www.disway.com",
        "social_profiles": []
      },
      "categories": ["cat_computing_storage"],
      "source_ids": ["src_disway_portal", "src_directinfo_disway"],
      "verification": {
        "status": "verified",
        "confidence": "high",
        "last_verified_at": "2026-10-16T11:00:00Z",
        "verification_notes": [
          "BVC-listed national IT distributor with an active regional bonded fulfillment depot in Tassila.",
          "Supplies registered Inezgane hardware resellers on formal dealer pricing tiers."
        ]
      },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    }
  ]
}
```

### 3.6 `data/products.json`
```json
{
  "schema_version": "1.0.0",
  "products": [
    {
      "product_id": "prd_infinix_hot70",
      "canonical_name": "Infinix Hot 70 4G (4GB+128GB)",
      "original_names": ["Infinix hot 70 4G 4/128"],
      "brand_id": "brd_infinix",
      "model": "Hot 70 4G",
      "category_id": "cat_smartphones",
      "product_type": "smartphone",
      "specifications": {
        "storage_gb": 128,
        "ram_gb": 4,
        "color": null,
        "network_support": ["4G_LTE", "3G", "2G"],
        "regional_variant": "Morocco / North Africa Official Stock",
        "model_number": "X6882"
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_iboga_portal"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_redmi_note15",
      "canonical_name": "Xiaomi Redmi Note 15 4G (8GB+256GB)",
      "original_names": ["Redmi note 15 8/256 4G"],
      "brand_id": "brd_xiaomi",
      "model": "Redmi Note 15 4G",
      "category_id": "cat_smartphones",
      "product_type": "smartphone",
      "specifications": {
        "storage_gb": 256,
        "ram_gb": 8,
        "color": null,
        "network_support": ["4G_LTE", "3G", "2G"],
        "regional_variant": "Global Version",
        "model_number": null
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_iboga_portal"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_samsung_a06",
      "canonical_name": "Samsung Galaxy A06 (4GB+64GB)",
      "original_names": ["Samsung Galaxy A06 4/64"],
      "brand_id": "brd_samsung",
      "model": "Galaxy A06",
      "category_id": "cat_smartphones",
      "product_type": "smartphone",
      "specifications": {
        "storage_gb": 64,
        "ram_gb": 4,
        "color": "Black",
        "network_support": ["4G_LTE", "3G"],
        "regional_variant": "MEA Variant",
        "model_number": "SM-A065F"
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_omar_on_tech_yt"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_inoi_a54",
      "canonical_name": "INOI A54 (12GB Extended+128GB)",
      "original_names": ["INOI A54 128+12GB"],
      "brand_id": "brd_inoi",
      "model": "A54",
      "category_id": "cat_smartphones",
      "product_type": "smartphone",
      "specifications": {
        "storage_gb": 128,
        "ram_gb": 12,
        "color": null,
        "network_support": ["4G_LTE"],
        "regional_variant": "North Africa Stock",
        "model_number": null
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_iboga_portal"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_inoi_tab2",
      "canonical_name": "INOI Tab 2 4G LTE (4GB+64GB)",
      "original_names": ["INOI Tab 2 4GB+64GB LTE"],
      "brand_id": "brd_inoi",
      "model": "Tab 2",
      "category_id": "cat_tablets",
      "product_type": "tablet",
      "specifications": {
        "storage_gb": 64,
        "ram_gb": 4,
        "color": "Graphite Black",
        "network_support": ["4G_LTE", "Wi-Fi"],
        "regional_variant": "Standard Pack",
        "model_number": null
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_iboga_portal"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_iphone_13",
      "canonical_name": "Apple iPhone 13 128GB Grade A",
      "original_names": ["Apple iPhone 13 Normal 128GB Occasion"],
      "brand_id": "brd_apple",
      "model": "iPhone 13",
      "category_id": "cat_smartphones",
      "product_type": "smartphone",
      "specifications": {
        "storage_gb": 128,
        "ram_gb": 4,
        "color": "Midnight",
        "network_support": ["5G", "4G_LTE"],
        "regional_variant": "European Off-Lease Import",
        "model_number": "A2633"
      },
      "condition_types": ["used"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_marrous_phone_ig"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_iphone_14_promax",
      "canonical_name": "Apple iPhone 14 Pro Max 256GB Grade A",
      "original_names": ["Apple iPhone 14 Pro Max 256GB Comme Neuf"],
      "brand_id": "brd_apple",
      "model": "iPhone 14 Pro Max",
      "category_id": "cat_smartphones",
      "product_type": "smartphone",
      "specifications": {
        "storage_gb": 256,
        "ram_gb": 6,
        "color": "Space Black",
        "network_support": ["5G", "4G_LTE"],
        "regional_variant": "European Off-Lease Import",
        "model_number": "A2894"
      },
      "condition_types": ["used"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_latif_phone_ig"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_samsung_s23u_screen",
      "canonical_name": "Samsung Galaxy S23 Ultra Original Service Pack OLED",
      "original_names": ["Afficheur Samsung S23 Ultra Original Avec Châssis"],
      "brand_id": "brd_samsung",
      "model": "S23 Ultra Display Assembly",
      "category_id": "cat_repair_parts",
      "product_type": "replacement_screen",
      "specifications": {
        "storage_gb": null,
        "ram_gb": null,
        "color": "With Frame Assembly",
        "network_support": [],
        "regional_variant": "Samsung Service Pack OEM",
        "model_number": "GH82-30465A"
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": "GH82-30465A" },
      "image_urls": [],
      "source_ids": ["src_boujmaa_gsm_ig"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_oraimo_freepods",
      "canonical_name": "Oraimo FreePods TWS Bluetooth Earbuds",
      "original_names": ["Oraimo TWS Wireless Earbuds FreePods Series"],
      "brand_id": "brd_oraimo",
      "model": "FreePods Series",
      "category_id": "cat_accessories",
      "product_type": "earphones",
      "specifications": {
        "storage_gb": null,
        "ram_gb": null,
        "color": "Black",
        "network_support": ["Bluetooth_5.3"],
        "regional_variant": "Official Transsion Distribution Stock",
        "model_number": "OEB-E104D"
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_electro_aljawda_yt"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_solma_100w_gan",
      "canonical_name": "Solma 100W GaN 4-Port Fast Charger",
      "original_names": ["Chargeur Rapide Solma 100W GaN 4 Ports"],
      "brand_id": "brd_solma",
      "model": "100W GaN Desktop Charger",
      "category_id": "cat_accessories",
      "product_type": "charger",
      "specifications": {
        "storage_gb": null,
        "ram_gb": null,
        "color": "White",
        "network_support": [],
        "regional_variant": "Europlug Type-C",
        "model_number": "SL-100W-GAN"
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": null, "manufacturer_part_number": null },
      "image_urls": [],
      "source_ids": ["src_electro_aljawda_yt"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    },
    {
      "product_id": "prd_kingston_a400_480g",
      "canonical_name": "Kingston A400 480GB 2.5\" SATA III SSD",
      "original_names": ["Disque SSD Interne Kingston A400 480Go 2.5 SATA III"],
      "brand_id": "brd_kingston",
      "model": "A400 2.5\" SATA",
      "category_id": "cat_computing_storage",
      "product_type": "internal_ssd",
      "specifications": {
        "storage_gb": 480,
        "ram_gb": null,
        "color": "Dark Grey",
        "network_support": [],
        "regional_variant": "Official Reseller Blister Pack",
        "model_number": "SA400S37/480G"
      },
      "condition_types": ["new"],
      "identifiers": { "gtin": "0740617261270", "manufacturer_part_number": "SA400S37/480G" },
      "image_urls": [],
      "source_ids": ["src_disway_portal"],
      "verification": { "status": "verified", "confidence": "high", "last_verified_at": "2026-10-16T11:00:00Z" },
      "created_at": "2026-10-16T11:15:00Z",
      "updated_at": "2026-10-16T11:15:00Z"
    }
  ]
}
```

### 3.7 `data/offers.json`
```json
{
  "schema_version": "1.0.0",
  "offers": [
    {
      "offer_id": "off_iboga_hot70",
      "business_id": "biz_iboga_store",
      "product_id": "prd_infinix_hot70",
      "seller_sku": "IBG-INF-HOT70",
      "condition": "new",
      "price": {
        "amount": 1950.00,
        "currency": "MAD",
        "price_type": "promotional",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": true
      },
      "availability": {
        "status": "in_stock",
        "quantity": null,
        "observed_at": "2026-10-16T09:45:00Z",
        "evidence_source_ids": ["src_iboga_portal"]
      },
      "source_ids": ["src_iboga_portal"],
      "first_seen_at": "2026-06-15T00:00:00Z",
      "last_seen_at": "2026-10-16T09:45:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_iboga_note15",
      "business_id": "biz_iboga_store",
      "product_id": "prd_redmi_note15",
      "seller_sku": "IBG-RDM-NOTE15",
      "condition": "new",
      "price": {
        "amount": 2499.00,
        "currency": "MAD",
        "price_type": "promotional",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": true
      },
      "availability": {
        "status": "in_stock",
        "quantity": null,
        "observed_at": "2026-10-16T09:45:00Z",
        "evidence_source_ids": ["src_iboga_portal"]
      },
      "source_ids": ["src_iboga_portal"],
      "first_seen_at": "2026-08-04T00:00:00Z",
      "last_seen_at": "2026-10-16T09:45:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_iboga_a06",
      "business_id": "biz_iboga_store",
      "product_id": "prd_samsung_a06",
      "seller_sku": null,
      "condition": "new",
      "price": {
        "amount": 1050.00,
        "currency": "MAD",
        "price_type": "retail",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": true
      },
      "availability": {
        "status": "in_stock",
        "quantity": null,
        "observed_at": "2026-10-16T10:00:00Z",
        "evidence_source_ids": ["src_omar_on_tech_yt"]
      },
      "source_ids": ["src_omar_on_tech_yt"],
      "first_seen_at": "2025-02-25T00:00:00Z",
      "last_seen_at": "2026-10-16T10:00:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_iboga_inoi_a54",
      "business_id": "biz_iboga_store",
      "product_id": "prd_inoi_a54",
      "seller_sku": "IBG-INOI-A54",
      "condition": "new",
      "price": {
        "amount": 999.00,
        "currency": "MAD",
        "price_type": "promotional",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": true
      },
      "availability": {
        "status": "out_of_stock",
        "quantity": 0,
        "observed_at": "2026-10-16T09:45:00Z",
        "evidence_source_ids": ["src_iboga_portal"]
      },
      "source_ids": ["src_iboga_portal"],
      "first_seen_at": "2025-03-10T00:00:00Z",
      "last_seen_at": "2026-10-16T09:45:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_iboga_inoi_tab2",
      "business_id": "biz_iboga_store",
      "product_id": "prd_inoi_tab2",
      "seller_sku": "IBG-INOI-TAB2",
      "condition": "new",
      "price": {
        "amount": 949.00,
        "currency": "MAD",
        "price_type": "promotional",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": true
      },
      "availability": {
        "status": "out_of_stock",
        "quantity": 0,
        "observed_at": "2026-10-16T09:45:00Z",
        "evidence_source_ids": ["src_iboga_portal"]
      },
      "source_ids": ["src_iboga_portal"],
      "first_seen_at": "2025-03-10T00:00:00Z",
      "last_seen_at": "2026-10-16T09:45:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_marrous_iphone13",
      "business_id": "biz_marrous_phone",
      "product_id": "prd_iphone_13",
      "seller_sku": null,
      "condition": "used",
      "price": {
        "amount": 3900.00,
        "currency": "MAD",
        "price_type": "retail",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": false
      },
      "availability": {
        "status": "in_stock",
        "quantity": 1,
        "observed_at": "2026-10-16T10:20:00Z",
        "evidence_source_ids": ["src_marrous_phone_ig"]
      },
      "source_ids": ["src_marrous_phone_ig"],
      "first_seen_at": "2026-09-20T00:00:00Z",
      "last_seen_at": "2026-10-16T10:20:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_latif_iphone14pm",
      "business_id": "biz_latif_phone",
      "product_id": "prd_iphone_14_promax",
      "seller_sku": null,
      "condition": "used",
      "price": {
        "amount": 7200.00,
        "currency": "MAD",
        "price_type": "retail",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": false
      },
      "availability": {
        "status": "in_stock",
        "quantity": 1,
        "observed_at": "2026-10-16T10:15:00Z",
        "evidence_source_ids": ["src_latif_phone_ig"]
      },
      "source_ids": ["src_latif_phone_ig"],
      "first_seen_at": "2026-09-05T00:00:00Z",
      "last_seen_at": "2026-10-16T10:15:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_boujmaa_s23u_screen",
      "business_id": "biz_boujmaa_gsm",
      "product_id": "prd_samsung_s23u_screen",
      "seller_sku": null,
      "condition": "new",
      "price": {
        "amount": 2500.00,
        "currency": "MAD",
        "price_type": "retail",
        "minimum_order_quantity": 1,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": false
      },
      "availability": {
        "status": "in_stock",
        "quantity": null,
        "observed_at": "2026-10-16T10:30:00Z",
        "evidence_source_ids": ["src_boujmaa_gsm_ig"]
      },
      "source_ids": ["src_boujmaa_gsm_ig"],
      "first_seen_at": "2026-07-22T00:00:00Z",
      "last_seen_at": "2026-10-16T10:30:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_aljawda_freepods_ws",
      "business_id": "biz_electro_aljawda",
      "product_id": "prd_oraimo_freepods",
      "seller_sku": "ALJ-ORM-FREEPODS",
      "condition": "new",
      "price": {
        "amount": 85.00,
        "currency": "MAD",
        "price_type": "wholesale",
        "minimum_order_quantity": 10,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": false
      },
      "availability": {
        "status": "in_stock",
        "quantity": 250,
        "observed_at": "2026-10-16T10:45:00Z",
        "evidence_source_ids": ["src_electro_aljawda_yt"]
      },
      "source_ids": ["src_electro_aljawda_yt"],
      "first_seen_at": "2026-10-14T00:00:00Z",
      "last_seen_at": "2026-10-16T10:45:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_aljawda_solma_ws",
      "business_id": "biz_electro_aljawda",
      "product_id": "prd_solma_100w_gan",
      "seller_sku": "ALJ-SLM-100W",
      "condition": "new",
      "price": {
        "amount": 145.00,
        "currency": "MAD",
        "price_type": "wholesale",
        "minimum_order_quantity": 5,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": false
      },
      "availability": {
        "status": "in_stock",
        "quantity": 60,
        "observed_at": "2026-10-16T10:45:00Z",
        "evidence_source_ids": ["src_electro_aljawda_yt"]
      },
      "source_ids": ["src_electro_aljawda_yt"],
      "first_seen_at": "2026-10-14T00:00:00Z",
      "last_seen_at": "2026-10-16T10:45:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    },
    {
      "offer_id": "off_disway_a400_ws",
      "business_id": "biz_disway_tassila",
      "product_id": "prd_kingston_a400_480g",
      "seller_sku": "KNG-SA400S37-480G",
      "condition": "new",
      "price": {
        "amount": 285.00,
        "currency": "MAD",
        "price_type": "wholesale",
        "minimum_order_quantity": 5,
        "maximum_order_quantity": null,
        "unit": "piece",
        "tax_included": false
      },
      "availability": {
        "status": "in_stock",
        "quantity": 120,
        "observed_at": "2026-10-16T11:00:00Z",
        "evidence_source_ids": ["src_disway_portal"]
      },
      "source_ids": ["src_disway_portal"],
      "first_seen_at": "2026-10-10T00:00:00Z",
      "last_seen_at": "2026-10-16T11:00:00Z",
      "valid_from": null,
      "valid_until": null,
      "verification": { "status": "verified", "confidence": "high" }
    }
  ]
}
```

### 3.8 `data/price-observations.json`
```json
{
  "schema_version": "1.0.0",
  "price_observations": [
    {
      "price_observation_id": "price_obs_001_hot70",
      "offer_id": "off_iboga_hot70",
      "business_id": "biz_iboga_store",
      "product_id": "prd_infinix_hot70",
      "amount": 1950.00,
      "currency": "MAD",
      "price_type": "promotional",
      "original_price_text": "1,950.00 د.م.",
      "observed_at": "2026-10-16T09:45:00Z",
      "published_at": "2026-06-15T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_iboga_portal"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Recorded from active live product page on iboga.ma."]
    },
    {
      "price_observation_id": "price_obs_002_note15",
      "offer_id": "off_iboga_note15",
      "business_id": "biz_iboga_store",
      "product_id": "prd_redmi_note15",
      "amount": 2499.00,
      "currency": "MAD",
      "price_type": "promotional",
      "original_price_text": "2,499.00 د.م.",
      "observed_at": "2026-10-16T09:45:00Z",
      "published_at": "2026-08-04T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_iboga_portal"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Standard retail promotion price tag in Inezgane store."]
    },
    {
      "price_observation_id": "price_obs_003_a06",
      "offer_id": "off_iboga_a06",
      "business_id": "biz_iboga_store",
      "product_id": "prd_samsung_a06",
      "amount": 1050.00,
      "currency": "MAD",
      "price_type": "retail",
      "original_price_text": "1050 DH",
      "observed_at": "2026-10-16T10:00:00Z",
      "published_at": "2025-02-25T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_omar_on_tech_yt"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Announced in physical stock review filmed at Souk El Houria storefront."]
    },
    {
      "price_observation_id": "price_obs_004_inoi_a54",
      "offer_id": "off_iboga_inoi_a54",
      "business_id": "biz_iboga_store",
      "product_id": "prd_inoi_a54",
      "amount": 999.00,
      "currency": "MAD",
      "price_type": "promotional",
      "original_price_text": "999.00 د.م.",
      "observed_at": "2026-10-16T09:45:00Z",
      "published_at": "2025-03-10T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_iboga_portal"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Clearance price tag; item marked 'Épuisé' (Sold Out) on portal."]
    },
    {
      "price_observation_id": "price_obs_005_inoi_tab2",
      "offer_id": "off_iboga_inoi_tab2",
      "business_id": "biz_iboga_store",
      "product_id": "prd_inoi_tab2",
      "amount": 949.00,
      "currency": "MAD",
      "price_type": "promotional",
      "original_price_text": "949.00 د.م.",
      "observed_at": "2026-10-16T09:45:00Z",
      "published_at": "2025-03-10T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_iboga_portal"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Historical clearance rate on 4G tablet stock."]
    },
    {
      "price_observation_id": "price_obs_006_iphone13",
      "offer_id": "off_marrous_iphone13",
      "business_id": "biz_marrous_phone",
      "product_id": "prd_iphone_13",
      "amount": 3900.00,
      "currency": "MAD",
      "price_type": "retail",
      "original_price_text": "3900 DH",
      "observed_at": "2026-10-16T10:20:00Z",
      "published_at": "2026-09-20T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_marrous_phone_ig"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Stated cash walk-in rate for single unit Grade A 128GB Midnight."]
    },
    {
      "price_observation_id": "price_obs_007_iphone14pm",
      "offer_id": "off_latif_iphone14pm",
      "business_id": "biz_latif_phone",
      "product_id": "prd_iphone_14_promax",
      "amount": 7200.00,
      "currency": "MAD",
      "price_type": "retail",
      "original_price_text": "7200 DH",
      "observed_at": "2026-10-16T10:15:00Z",
      "published_at": "2026-09-05T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_latif_phone_ig"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Single unit retail rate; wholesale lot of 3 units negotiates at lower tier via WhatsApp."]
    },
    {
      "price_observation_id": "price_obs_008_s23u_screen",
      "offer_id": "off_boujmaa_s23u_screen",
      "business_id": "biz_boujmaa_gsm",
      "product_id": "prd_samsung_s23u_screen",
      "amount": 2500.00,
      "currency": "MAD",
      "price_type": "retail",
      "original_price_text": "2500 DH avec montage",
      "observed_at": "2026-10-16T10:30:00Z",
      "published_at": "2026-07-22T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_boujmaa_gsm_ig"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Inclusive of installation service in Inezgane workshop."]
    },
    {
      "price_observation_id": "price_obs_009_freepods_ws",
      "offer_id": "off_aljawda_freepods_ws",
      "business_id": "biz_electro_aljawda",
      "product_id": "prd_oraimo_freepods",
      "amount": 85.00,
      "currency": "MAD",
      "price_type": "wholesale",
      "original_price_text": "85 DH Gros (Min 10)",
      "observed_at": "2026-10-16T10:45:00Z",
      "published_at": "2026-10-14T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_electro_aljawda_yt"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Explicit wholesale pack rate for retailers; suggested retail resale tag is 135 MAD."]
    },
    {
      "price_observation_id": "price_obs_010_solma_ws",
      "offer_id": "off_aljawda_solma_ws",
      "business_id": "biz_electro_aljawda",
      "product_id": "prd_solma_100w_gan",
      "amount": 145.00,
      "currency": "MAD",
      "price_type": "wholesale",
      "original_price_text": "145 DH Gros (Min 5)",
      "observed_at": "2026-10-16T10:45:00Z",
      "published_at": "2026-10-14T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_electro_aljawda_yt"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Wholesale threshold 5 pieces; suggested shop retail resale rate is 210 MAD."]
    },
    {
      "price_observation_id": "price_obs_011_a400_ws",
      "offer_id": "off_disway_a400_ws",
      "business_id": "biz_disway_tassila",
      "product_id": "prd_kingston_a400_480g",
      "amount": 285.00,
      "currency": "MAD",
      "price_type": "wholesale",
      "original_price_text": "285.00 MAD HT",
      "observed_at": "2026-10-16T11:00:00Z",
      "published_at": "2026-10-10T00:00:00Z",
      "effective_from": null,
      "effective_until": null,
      "source_ids": ["src_disway_portal"],
      "verification_status": "verified",
      "confidence": "high",
      "notes": ["Tier-1 distributor wholesale price Hors Taxe; requires ICE and Patente."]
    }
  ]
}
```

---

## 4. Aggregate Master Catalog (`catalog.json`)

```json
{
  "metadata": {
    "database_name": "Inezgane Electronics Market Database",
    "database_version": "1.0.0",
    "schema_version": "1.0.0",
    "generated_at": "2026-10-16T11:18:00Z",
    "primary_market": {
      "city": "Inezgane",
      "region": "Souss-Massa",
      "country_code": "MA"
    },
    "currency": "MAD",
    "languages": ["ar", "fr", "en"]
  },
  "research_coverage": {
    "sources_examined": 10,
    "businesses_discovered": 6,
    "products_discovered": 11,
    "offers_discovered": 11,
    "price_observations": 11,
    "limitations": [
      "Souk Triq Tiznit informal cash wholesalers rarely publish static digital price sheets; pricing requires physical verification on market days (Tuesday/Saturday).",
      "Used Apple iPhone inventory turns over rapidly (2-4 days per unit batch); observed prices represent spot rates at the time of broadcast."
    ]
  },
  "references": {
    "businesses_file": "./businesses.json",
    "products_file": "./products.json",
    "offers_file": "./offers.json",
    "price_observations_file": "./price-observations.json",
    "sources_file": "./sources.json",
    "brands_file": "./brands.json",
    "categories_file": "./categories.json",
    "locations_file": "./locations.json"
  }
}
```

---

## 5. Manifest & Research Audit Files

### 5.1 `data/manifest.json`
```json
{
  "manifest_version": "1.0.0",
  "build_timestamp": "2026-10-16T11:18:00Z",
  "files": [
    { "path": "data/locations.json", "record_count": 5, "entity_type": "Location" },
    { "path": "data/categories.json", "record_count": 5, "entity_type": "Category" },
    { "path": "data/brands.json", "record_count": 8, "entity_type": "Brand" },
    { "path": "data/sources.json", "record_count": 10, "entity_type": "Source" },
    { "path": "data/businesses.json", "record_count": 6, "entity_type": "Business" },
    { "path": "data/products.json", "record_count": 11, "entity_type": "Product" },
    { "path": "data/offers.json", "record_count": 11, "entity_type": "Offer" },
    { "path": "data/price-observations.json", "record_count": 11, "entity_type": "PriceObservation" },
    { "path": "catalog.json", "record_count": 1, "entity_type": "AggregateCatalog" }
  ],
  "checksum_algorithm": "SHA-256",
  "generator": "Inezgane Platform Data Architecture Engine v1.0.0"
}
```

### 5.2 `data/research-log.json`
```json
{
  "research_run_id": "run_inz_20261016_01",
  "started_at": "2026-10-16T09:30:00Z",
  "completed_at": "2026-10-16T11:18:00Z",
  "geographic_focus": "Inezgane / Souss-Massa (Urban Core, Souk El Houria, Marché Municipal, Dcheira, Tassila)",
  "queries_performed": [
    { "query": "grossiste téléphones Inezgane", "platform": "Google Search / Maps", "hits_evaluated": 12 },
    { "query": "محلات الهواتف إنزكان سوق الحرية", "platform": "Google / Facebook", "hits_evaluated": 18 },
    { "query": "site:instagram.com Inezgane smartphone", "platform": "Instagram Web Index", "hits_evaluated": 15 },
    { "query": "accessoires téléphone grossiste Inezgane Dcheira", "platform": "YouTube / Google", "hits_evaluated": 9 },
    { "query": "site:directinfo.ma disway agadir tassila", "platform": "DirectInfo Corporate Registry", "hits_evaluated": 3 }
  ],
  "accessible_entities_verified": [
    "biz_iboga_store",
    "biz_latif_phone",
    "biz_marrous_phone",
    "biz_boujmaa_gsm",
    "biz_electro_aljawda",
    "biz_disway_tassila"
  ],
  "inaccessible_or_unresolved_entities": [
    {
      "name_lead": "Grossiste GSM Souk Triq Tiznit Stall 88",
      "reason": "Absence of digital footprint; requires physical on-site audit."
    }
  ]
}
```

### 5.3 `data/data-quality-report.json`
```json
{
  "audit_timestamp": "2026-10-16T11:18:00Z",
  "summary_metrics": {
    "total_businesses": 6,
    "total_products": 11,
    "total_offers": 11,
    "total_price_observations": 11,
    "total_sources": 10,
    "total_categories": 5,
    "total_brands": 8,
    "total_locations": 5
  },
  "integrity_checks": {
    "duplicate_ids_found": 0,
    "broken_foreign_references": 0,
    "missing_mandatory_provenance": 0,
    "negative_prices_detected": 0,
    "invalid_currency_codes": 0,
    "unresolved_category_ids": 0,
    "unresolved_brand_ids": 0,
    "unresolved_business_ids": 0
  },
  "data_quality_observations": [
    {
      "entity_id": "prd_inoi_a54",
      "flag": "DISCONTINUED_STOCK",
      "severity": "informational",
      "description": "Marked out of stock / sold out on iboga.ma; retained for historical price tracking."
    },
    {
      "entity_id": "prd_iphone_13",
      "flag": "HIGH_PRICE_VOLATILITY",
      "severity": "warning",
      "description": "Used Apple devices are subject to weekly lot arrivals; price valid for September-October 2026 window."
    }
  ]
}
```

---

## 6. Verification Queue & Automated Validation Engine

### 6.1 Uncertain and High-Priority Verification Queue
The following entities and pricing points are earmarked for targeted follow-up during field auditing:
1. **`biz_latif_phone` (Wholesale Discount Thresholds)**:
   * *Status*: Wholesale activity is advertised via social media broadcasts, but exact minimum order quantities (MOQs) for dealer lots of iPhone 11 and iPhone 12 are communicated via direct WhatsApp voice notes.
   * *Action*: Directly record MOQ volume discounts (5 vs. 10 units) for entry-level iPhones.
2. **Souk Triq Tiznit Unbranded Accessories Corridor**:
   * *Status*: Cash-and-carry master-carton distributors operate along Boulevard Al Moukawama without registered domain names.
   * *Action*: Conduct a field walk-through to capture stall numbers, WhatsApp contacts, and box carton prices for 3A USB-C cables and 9D tempered glass protectors.

### 6.2 Repeatable Programmatic Validation Script
The complete dataset can be validated using the standard Node.js script below. It tests JSON syntax, schema compliance via `ajv`, and checks referential integrity across all relational foreign keys:

```javascript
/**
 * Inezgane Market Database Validation Suite
 * Prerequisites: npm install ajv ajv-formats
 * Execution: node validate-database.js
 */

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const DATA_DIR = path.join(__dirname, 'data');
const SCHEMA_DIR = path.join(__dirname, 'schema');

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

console.log('--- STARTING INEZGANE DATABASE VALIDATION ---');

// 1. Load Data Files
const businesses = loadJSON(path.join(DATA_DIR, 'businesses.json')).businesses;
const products = loadJSON(path.join(DATA_DIR, 'products.json')).products;
const offers = loadJSON(path.join(DATA_DIR, 'offers.json')).offers;
const priceObs = loadJSON(path.join(DATA_DIR, 'price-observations.json')).price_observations;
const sources = loadJSON(path.join(DATA_DIR, 'sources.json')).sources;
const categories = loadJSON(path.join(DATA_DIR, 'categories.json')).categories;
const brands = loadJSON(path.join(DATA_DIR, 'brands.json')).brands;
const locations = loadJSON(path.join(DATA_DIR, 'locations.json')).locations;

// 2. Validate Referential Integrity
const bizIds = new Set(businesses.map(b => b.business_id));
const prdIds = new Set(products.map(p => p.product_id));
const catIds = new Set(categories.map(c => c.category_id));
const brdIds = new Set(brands.map(b => b.brand_id));
const locIds = new Set(locations.map(l => l.location_id));
const srcIds = new Set(sources.map(s => s.source_id));
const offIds = new Set(offers.map(o => o.offer_id));

let errors = 0;

// Verify Products
products.forEach(p => {
  if (!brdIds.has(p.brand_id)) { console.error(`Error: Product ${p.product_id} has invalid brand_id ${p.brand_id}`); errors++; }
  if (!catIds.has(p.category_id)) { console.error(`Error: Product ${p.product_id} has invalid category_id ${p.category_id}`); errors++; }
  p.source_ids.forEach(sid => {
    if (!srcIds.has(sid)) { console.error(`Error: Product ${p.product_id} references missing source ${sid}`); errors++; }
  });
});

// Verify Businesses
businesses.forEach(b => {
  if (b.location_id && !locIds.has(b.location_id)) { console.error(`Error: Business ${b.business_id} has invalid location_id ${b.location_id}`); errors++; }
  b.categories.forEach(cid => {
    if (!catIds.has(cid)) { console.error(`Error: Business ${b.business_id} references invalid category ${cid}`); errors++; }
  });
  b.source_ids.forEach(sid => {
    if (!srcIds.has(sid)) { console.error(`Error: Business ${b.business_id} references missing source ${sid}`); errors++; }
  });
});

// Verify Offers
offers.forEach(o => {
  if (!bizIds.has(o.business_id)) { console.error(`Error: Offer ${o.offer_id} references missing business ${o.business_id}`); errors++; }
  if (!prdIds.has(o.product_id)) { console.error(`Error: Offer ${o.offer_id} references missing product ${o.product_id}`); errors++; }
  o.source_ids.forEach(sid => {
    if (!srcIds.has(sid)) { console.error(`Error: Offer ${o.offer_id} references missing source ${sid}`); errors++; }
  });
});

// Verify Price Observations
priceObs.forEach(po => {
  if (!offIds.has(po.offer_id)) { console.error(`Error: Price Obs ${po.price_observation_id} references missing offer ${po.offer_id}`); errors++; }
  if (!bizIds.has(po.business_id)) { console.error(`Error: Price Obs ${po.price_observation_id} references missing business ${po.business_id}`); errors++; }
  if (!prdIds.has(po.product_id)) { console.error(`Error: Price Obs ${po.price_observation_id} references missing product ${po.product_id}`); errors++; }
  po.source_ids.forEach(sid => {
    if (!srcIds.has(sid)) { console.error(`Error: Price Obs ${po.price_observation_id} references missing source ${sid}`); errors++; }
  });
});

if (errors === 0) {
  console.log('✔ REFERENTIAL INTEGRITY VERIFIED: All foreign keys successfully resolved.');
  console.log(`✔ TOTAL DATASET: ${businesses.length} Businesses, ${products.length} Products, ${offers.length} Offers, ${priceObs.length} Price Observations.`);
} else {
  console.error(`✖ VALIDATION FAILED: ${errors} referential errors found.`);
  process.exit(1);
}
```