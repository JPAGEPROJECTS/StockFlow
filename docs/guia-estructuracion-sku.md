# Guía de Estructuración de SKUs

Norma técnica para la creación y asignación de SKUs (Stock Keeping Unit) dentro de StockFlow, aplicada a piezas de bisutería y joyería hecha a mano (pulseras, collares, anillos, aretes, tobilleras y conjuntos).

> **Por qué importa:** el SKU es el identificador único de cada producto en `products.sku` (columna `unique` en la base de datos). Un SKU bien estructurado permite identificar de un vistazo la categoría, el material y la variante de una pieza sin abrir el sistema, además de ser compatible con lectores de código de barras.

---

## 1. Estructura estándar del SKU

### Patrón

```
[CAT]-[MAT]-[COL]-[VAR]-[NUM]
```

| Segmento | Significado                  | Longitud   | Obligatorio |
|----------|-------------------------------|------------|:-----------:|
| `CAT`    | Categoría del producto         | 3 letras   | Sí |
| `MAT`    | Material principal              | 3 letras   | Sí |
| `COL`    | Colección / estilo              | 2-3 letras | Sí |
| `VAR`    | Variante (color/atributo)       | 2-3 letras | Sí |
| `NUM`    | Folio consecutivo               | 2-3 dígitos| Sí |

### Reglas de formato

> ⚠️ **Reglas estrictas — un SKU que no las cumpla debe rechazarse antes de capturarse en `/inventario`.**

- **Solo mayúsculas.** Sin minúsculas, sin acentos, sin ñ.
- **Guion simple (`-`) como único separador.** Nunca espacios, guion bajo, ni doble guion.
- **Sin caracteres especiales** (`/`, `.`, `#`, `&`, etc.) ni emojis.
- **Longitud total: entre 12 y 16 caracteres**, incluyendo los guiones. Ejemplo con longitudes mínimas/máximas por segmento: `PUL-GDF-VER-AZL-001` (19 caracteres) **excede el máximo** — en ese caso se recorta la variante o el folio a 2 dígitos hasta entrar en el rango (ver ejemplos en la sección 4).
- **El folio (`NUM`) es consecutivo por combinación `CAT-MAT-COL-VAR`**, no global. Esto evita que agregar una categoría nueva "salte" los números de las demás.
- **Nunca reutilizar un SKU dado de baja.** Si un producto se desactiva (`is_active = false`), su SKU queda retirado permanentemente — no se reasigna a una pieza distinta, aunque sea similar.

---

## 2. Diccionario de códigos (tablas de mapeo)

### 2.1 Categorías (3 letras)

| Código | Categoría |
|--------|-----------|
| `PUL`  | Pulseras |
| `COL`  | Collares |
| `ANI`  | Anillos |
| `ARE`  | Aretes / Pendientes |
| `TOB`  | Tobilleras |
| `SET`  | Conjuntos / Sets |

### 2.2 Materiales principales (3 letras)

| Código | Material |
|--------|----------|
| `GDF`  | Gold Filled / Baño de oro |
| `PLT`  | Plata |
| `ACE`  | Acero inoxidable |
| `HIL`  | Hilo / Cordón |
| `CZO`  | Piedras naturales / Cuarzo |
| `CUE`  | Cuentas / Mostacilla |

> Si una pieza combina materiales (ej. plata con cuarzo), el `MAT` corresponde al material **predominante o protagonista** de la pieza; el material secundario se refleja en el `VAR` si es relevante para diferenciar variantes (ej. `AZL` para la variante con cuarzo azul).

### 2.3 Colección / estilo (2-3 letras)

| Código | Colección |
|--------|-----------|
| `VER`  | Verano |
| `CLA`  | Clásicos |
| `EDL`  | Edición limitada |
| `INV`  | Invierno |
| `MIN`  | Minimalista |
| `BOH`  | Boho |

> Esta tabla es extensible: al lanzar una colección nueva, agrega su código aquí **antes** de capturar el primer producto, para que quede documentado y no se improvise un código distinto cada vez.

### 2.4 Variantes de color / atributo (2-3 letras)

| Código | Variante |
|--------|----------|
| `DOR`  | Dorado |
| `PLA`  | Plateado |
| `NEG`  | Negro |
| `BLA`  | Blanco |
| `AZL`  | Azul |
| `ROJ`  | Rojo |
| `VRD`  | Verde |
| `ROS`  | Rosa |
| `MUL`  | Multicolor |

---

## 3. Casos especiales de bisutería artesanal

### 3.1 Piezas únicas / exclusivas (one-of-a-kind)

Las piezas irrepetibles (una sola unidad, sin reposición) usan `UNI` en el segmento de variante en lugar de un color, y el folio siempre es `001` (nunca habrá una segunda):

```
[CAT]-[MAT]-[COL]-UNI-001
```

> 💡 Como nunca se repiten, no aplica la regla de "no reutilizar SKU dado de baja" de la misma forma: si la pieza `UNI-001` se agota, el siguiente one-of-a-kind de esa misma combinación categoría/material/colección avanza a un folio nuevo (`UNI-002`), nunca reutiliza `001`.

### 3.2 Tallas o medidas

Cuando el producto tiene talla (pulseras/tobilleras por longitud, anillos por talla), la medida se agrega como un **sexto segmento opcional**, después del folio:

```
[CAT]-[MAT]-[COL]-[VAR]-[NUM]-[TALLA]
```

| Tipo de producto | Formato de talla | Ejemplo |
|---|---|---|
| Pulsera / tobillera | Longitud en cm (2 dígitos) | `17` (17 cm) |
| Anillo | Talla estándar mexicana (2 dígitos) | `07` |
| Prenda con talla genérica | S / M / L | `M` |

> Esto puede llevar el SKU por encima de 16 caracteres en casos con folio de 3 dígitos + talla. En ese caso, prioriza recortar el segmento de variante a 2 letras antes que omitir la talla — la talla es información operativa crítica para no vender una pieza que no corresponde.

### 3.3 Productos personalizados o bajo pedido

Los productos personalizados (grabado, medida a la medida, combinación de colores a elección del cliente) **no llevan variante de color fija**: se usa `PER` como código de variante, y se documenta el detalle de la personalización en el campo `reason`/nota del primer movimiento de inventario (`inventory_movements.reason`), no en el SKU:

```
[CAT]-[MAT]-[COL]-PER-[NUM]
```

> ⚠️ No inventes un código de variante nuevo por cada personalización — eso satura el diccionario de códigos y rompe la trazabilidad. `PER` + nota es suficiente.

---

## 4. Ejemplos prácticos reales

### Ejemplo 1 — Pulsera de colección
**Producto:** Pulsera ajustable, baño de oro, colección Verano, dije azul.

| Atributo | Valor |
|---|---|
| Categoría | Pulsera → `PUL` |
| Material | Gold Filled → `GDF` |
| Colección | Verano → `VER` |
| Variante | Azul → `AZL` |
| Folio | Primera de esta combinación → `001` |

```
SKU: PUL-GDF-VER-AZL-001
```

### Ejemplo 2 — Collar clásico en plata
**Producto:** Collar de plata, línea de Clásicos, acabado plateado.

| Atributo | Valor |
|---|---|
| Categoría | Collar → `COL` |
| Material | Plata → `PLT` |
| Colección | Clásicos → `CLA` |
| Variante | Plateado → `PLA` |
| Folio | Tercera de esta combinación → `003` |

```
SKU: COL-PLT-CLA-PLA-003
```

### Ejemplo 3 — Anillo con talla
**Producto:** Anillo de acero inoxidable, edición limitada, negro, talla 07.

| Atributo | Valor |
|---|---|
| Categoría | Anillo → `ANI` |
| Material | Acero inoxidable → `ACE` |
| Colección | Edición limitada → `EDL` |
| Variante | Negro → `NEG` |
| Folio | `001` |
| Talla | `07` |

```
SKU: ANI-ACE-EDL-NEG-001-07
```

### Ejemplo 4 — Pieza única de cuarzo
**Producto:** Collar artesanal de cuarzo rosa natural, pieza irrepetible.

| Atributo | Valor |
|---|---|
| Categoría | Collar → `COL` |
| Material | Piedras naturales/Cuarzo → `CZO` |
| Colección | Boho → `BOH` |
| Variante | One-of-a-kind → `UNI` |
| Folio | `001` (siempre, por ser única) |

```
SKU: COL-CZO-BOH-UNI-001
```

### Ejemplo 5 — Conjunto personalizado
**Producto:** Set de aretes + pulsera de hilo, combinación de colores a elección del cliente, grabado con iniciales.

| Atributo | Valor |
|---|---|
| Categoría | Conjunto/Set → `SET` |
| Material | Hilo/Cordón → `HIL` |
| Colección | Minimalista → `MIN` |
| Variante | Personalizado → `PER` |
| Folio | `012` |

```
SKU: SET-HIL-MIN-PER-012
```
Nota de personalización (va en `inventory_movements.reason`, no en el SKU): *"Grabado iniciales 'A.R.' — combinación turquesa/blanco a elección del cliente."*

---

## 5. Reglas para integración con el POS/ERP

### 5.1 Compatibilidad con escáneres de código de barras

- **Symbology recomendada: Code 128.** Soporta el set alfanumérico completo (mayúsculas, dígitos y guion) sin necesidad de checksum adicional, y es el estándar más compatible con lectores de punto de venta genéricos (USB/Bluetooth).
- **EAN-13** no es viable aquí: exige 13 dígitos numéricos únicamente y no admite letras — nuestro patrón `[CAT]-[MAT]-[COL]-[VAR]-[NUM]` es alfanumérico por diseño, así que **no debe forzarse a EAN**. Si en el futuro se requiere vender en un marketplace que exija EAN/UPC, se gestiona como un código adicional (`products` necesitaría una columna nueva, ej. `barcode_ean`), nunca sustituyendo el SKU interno.
- Evita el carácter `-` como **primer o último carácter** del SKU (algunos lectores mal configurados lo interpretan como delimitador de inicio/fin de trama) — el patrón definido en la sección 1 ya cumple esto por construcción.
- Prueba cada rango nuevo de SKUs con el lector real antes de imprimir un lote grande de etiquetas: algunos lectores económicos tienen problemas con guiones consecutivos o SKUs que superan los 20 caracteres.

> ⚠️ El límite de 12-16 caracteres de la sección 1 no es solo estético: varios lectores de código de barras económicos truncan o fallan al leer códigos Code 128 más largos de ~20 caracteres en letras pequeñas. Mantenerse en el rango definido asegura lecturas confiables incluso en etiquetas pequeñas.

### 5.2 Etiquetado físico en piezas pequeñas

- **Usa etiquetas tipo "mariposa" (butterfly/flag tag)** para pulseras, anillos y aretes: el código de barras va en la parte plana que se dobla sobre sí misma alrededor del hilo/cadena de la pieza, dejando el texto e ícono de la marca visibles por ambos lados sin cubrir la joya.
- **Tamaño de etiqueta recomendado:** 10×20 mm para el área de código de barras en piezas muy pequeñas (aretes, anillos) — suficiente para un Code 128 legible con SKUs dentro del límite de 16 caracteres.
- **No imprimas el precio directamente en la etiqueta de código de barras** si los precios cambian con frecuencia (promociones, ajustes de costo de material) — el precio se consulta en el POS al escanear; imprimirlo fijo obliga a re-etiquetar todo el inventario ante cualquier cambio.
- Para **collares y tobilleras**, la etiqueta puede ir amarrada con un hilo corto en vez de mariposa, siempre que no dañe ni deforme la pieza.
- Verifica el contraste de impresión en piezas de tono oscuro (acero negro, cuero): usa etiquetas de fondo blanco/claro siempre, nunca imprimas directamente sobre empaque oscuro.

---

## Resumen rápido

```
[CAT]-[MAT]-[COL]-[VAR]-[NUM]-[TALLA opcional]

CAT  → PUL, COL, ANI, ARE, TOB, SET
MAT  → GDF, PLT, ACE, HIL, CZO, CUE
COL  → VER, CLA, EDL, INV, MIN, BOH (extensible)
VAR  → color de la tabla 2.4, o UNI (pieza única), o PER (personalizado)
NUM  → folio consecutivo por combinación CAT-MAT-COL-VAR (2-3 dígitos)
```

> Máximo 16 caracteres totales. Solo mayúsculas, dígitos y guion simple. Sin excepciones.
