# Guía de Estructuración de SKUs

Norma para la creación de SKUs (Stock Keeping Unit) en StockFlow, aplicada a piezas de bisutería y joyería hecha a mano (pulseras, collares, anillos, aretes, tobilleras, conjuntos y accesorios).

> **Por qué importa:** el SKU es el identificador único de cada producto (`products.sku`, columna `unique` en la base de datos). Un SKU bien estructurado permite saber de un vistazo la categoría y el color de una pieza sin abrir el sistema, y es compatible con lectores de código de barras.

> **Desde la versión actual, StockFlow genera el SKU automáticamente** al crear un producto. Esta guía explica cómo lo arma, qué códigos usa y qué convenciones seguir para que los códigos salgan limpios. La lógica vive en `src/lib/sku.js`.

---

## 1. Formato del SKU

### Patrón

```
VR[CAT]-[COLOR]-[FOLIO]
```

| Segmento | Significado | Longitud | Ejemplo |
|----------|-------------|----------|---------|
| `VR` | Prefijo fijo de la tienda | 2 letras | `VR` |
| `CAT` | Categoría del producto (va pegada al prefijo) | 3 letras (2 si es sigla) | `PUL` |
| `COLOR` | Color de la pieza | 3 letras (2 si es sigla) | `AZL` |
| `FOLIO` | Número consecutivo | 3 dígitos mínimo | `001` |

**Ejemplo:** Pulsera azul, la primera registrada → **`VRPUL-AZL-001`**

### Reglas de formato

- **Solo mayúsculas, dígitos y guion simple (`-`).** Sin acentos, sin ñ, sin espacios ni caracteres especiales. El sistema quita acentos y convierte a mayúsculas solo.
- **El prefijo `VR` y la categoría van juntos**, sin guion (`VRPUL`, no `VR-PUL`).
- **Longitud:** normalmente 13 caracteres (`VRPUL-AZL-001`). Queda entre 12 y 16 en todos los casos habituales, el rango seguro para etiquetas y lectores (ver sección 8).
- **El SKU no se escribe a mano:** en el formulario de producto aparece en gris y se llena solo al elegir categoría y color.

---

## 2. Cómo lo genera StockFlow

1. En **Inventario → Nuevo producto** eliges la **Categoría** y el **Color** (ambos obligatorios al crear).
2. El sistema arma el prefijo (`VRPUL-AZL-`) y consulta en la base de datos el último folio usado con ese prefijo.
3. El campo **SKU** muestra la vista previa (`VRPUL-AZL-004`).
4. **Al guardar**, el folio se vuelve a consultar. Si otra persona registró ese mismo SKU en el mismo instante, el sistema reintenta con el siguiente número (hasta 3 veces).

### Qué pasa al editar

- **El SKU de un producto existente nunca cambia**, aunque se le cambie la categoría o el color. Puede estar impreso en etiquetas y el historial de ventas lo usa como referencia.
- Si una pieza quedó con la categoría o el color equivocados y todavía no tiene etiquetas ni ventas, lo correcto es **desactivarla y crearla de nuevo**.

### SKUs anteriores

Los productos que ya existían con el formato manual anterior (ver Anexo A) **conservan su SKU**. Solo los productos nuevos usan el formato `VR`.

---

## 3. Categorías

### 3.1 Códigos de categoría

| Grupo | Categoría | Código | Ejemplo de SKU |
|-------|-----------|:------:|----------------|
| Muñeca y tobillo | Pulseras | `PUL` | `VRPUL-AZL-001` |
| | Brazaletes | `BRZ` | `VRBRZ-DOR-001` |
| | Esclavas | `ESC` | `VRESC-PLA-001` |
| | Tobilleras | `TOB` | `VRTOB-TRQ-001` |
| Cuello | Collares | `COL` | `VRCOL-DOR-001` |
| | Gargantillas | `GRG` | `VRGRG-NEG-001` |
| | Cadenas | `CDN` | `VRCDN-PLA-001` |
| | Dijes | `DJS` | `VRDJS-ROS-001` |
| | Charms | `CHR` | `VRCHR-MUL-001` |
| Orejas | Aretes | `ARE` | `VRARE-DOR-001` |
| | Arracadas | `ARR` | `VRARR-DOR-001` |
| | Broqueles | `BRQ` | `VRBRQ-BLA-001` |
| | Earcuffs | `ERC` | `VRERC-PLA-001` |
| | Piercings | `PRC` | `VRPRC-NEG-001` |
| Manos | Anillos | `ANI` | `VRANI-PLA-001` |
| Juegos | Conjuntos | `SET` | `VRSET-MUL-001` |
| Cabello | Diademas | `DDM` | `VRDDM-NEG-001` |
| | Tiaras | `TRS` | `VRTRS-PLA-001` |
| | Pasadores | `PSD` | `VRPSD-DOR-001` |
| | Pinzas | `PNZ` | `VRPNZ-BLA-001` |
| Otros accesorios | Broches | `BRC` | `VRBRC-DOR-001` |
| | Llaveros | `LLV` | `VRLLV-MUL-001` |
| | Relojes | `RLJ` | `VRRLJ-NEG-001` |
| | Rosarios | `RSR` | `VRRSR-BLA-001` |
| | Denarios | `DNR` | `VRDNR-PLA-001` |
| | Mancuernillas | `MNC` | `VRMNC-PLA-001` |
| | Joyeros | `JYR` | `VRJYR-NEG-001` |

### 3.2 Cómo se obtiene el código

- **Categorías reconocidas:** Pulseras (`PUL`), Collares (`COL`), Anillos (`ANI`), Aretes/Pendientes (`ARE`), Tobilleras (`TOB`) y Conjuntos/Sets (`SET`) tienen un código fijo. Se reconocen por cualquier palabra del nombre: "Pulseras de hilo" también da `PUL`.
- **Cualquier otra categoría** se abrevia automáticamente con las reglas de la sección 6 (Brazaletes → `BRZ`).

### 3.3 Al crear categorías nuevas

- ⚠️ **No crees dos categorías que den el mismo código.** Ejemplos que chocan:
  - "Pendientes" junto a "Aretes": ambas dan `ARE`.
  - "Sets" junto a "Conjuntos": ambas dan `SET`.
  - "Anillos de compromiso" junto a "Anillos": ambas dan `ANI`.
- **Prefiere nombres de una sola palabra, en plural.** Así el código queda de 3 letras. Los nombres de varias palabras se convierten en sigla de 2 letras (ej. "Accesorios cabello" → `AC`).
- Antes de crear una categoría, revisa en la tabla 3.1 que su código no exista ya.

---

## 4. Colores

### 4.1 Colores oficiales

Son los colores que aparecen en la lista del campo **Color**, con código fijo y muestra visual:

| Color | Código | Muestra | Uso típico |
|-------|:------:|---------|------------|
| Dorado | `DOR` | 🟡 `#D4A73A` | Baño de oro, gold filled, latón |
| Plateado | `PLA` | ⚪ `#C0C0C8` | Plata, acero, rodio |
| Negro | `NEG` | ⚫ `#1C140F` | Acero negro, ónix, cuero |
| Blanco | `BLA` | ⚪ `#FFFFFF` | Perlas, nácar, cuentas blancas |
| Azul | `AZL` | 🔵 `#2F6FD1` | Cuarzo azul, lapislázuli, cristal azul |
| Rojo | `ROJ` | 🔴 `#C62828` | Hilo rojo, coral, cristal rojo |
| Verde | `VRD` | 🟢 `#2E7D32` | Jade, malaquita, cristal verde |
| Rosa | `ROS` | 🩷 `#E88AAE` | Cuarzo rosa, cuentas rosas |
| Multicolor | `MUL` | 🌈 degradado | Piezas de 3 o más colores sin uno dominante |

### 4.2 Otros colores (texto libre)

En el campo **Color** también puedes escribir un color que no esté en la lista y elegir **Usar «…»**. El código se genera con las reglas de la sección 6. Estos son los códigos que se obtienen para los colores más comunes en bisutería:

| Color | Código | | Color | Código |
|-------|:------:|-|-------|:------:|
| Turquesa | `TRQ` | | Coral | `CRL` |
| Morado | `MRD` | | Menta | `MNT` |
| Lavanda | `LVN` | | Perla | `PRL` |
| Lila | `LLI` | | Cobre | `CBR` |
| Beige | `BGE` | | Bronce | `BRN` |
| Nude | `NDU` | | Celeste | `CLS` |
| Café | `CFA` | | Fucsia | `FCS` |
| Gris | `GRS` | | Esmeralda | `ESM` |
| Amarillo | `AMR` | | Champagne | `CHM` |
| Naranja | `NRN` | | Durazno | `DRZ` |
| Vino | `VNI` | | Transparente | `TRN` |
| Oro | `ORO` | | Plata | `PLT` |
| Oro rosa | `OR` | | Azul marino | `AM` |
| Rojo vino | `RV` | | Verde menta | `VM` |

### 4.3 Recomendaciones para capturar colores

- **Usa siempre el mismo nombre para el mismo color.** "Rosa" da `ROS`, pero "Rosado" da `RSD`: el sistema los trata como colores distintos y lleva folios separados. Lo mismo pasa con "Plateado" (`PLA`) y "Plata" (`PLT`): elige uno y úsalo siempre.
- **Mayúsculas y acentos no importan.** "azul", "AZUL" y "Azúl" dan todos `AZL`.
- **Elige el color dominante de la pieza.** Si tiene 3 o más colores sin uno principal, usa **Multicolor**.
- **El color es el del acabado visible,** no el del material interno: una pieza de acero con baño de oro es **Dorado**.
- **Evita nombres de dos palabras** si puedes: "Oro rosa" queda como sigla de 2 letras (`OR`). Si lo usas seguido, conviene agregarlo como color oficial (sección 4.4).

### 4.4 Colores que chocan y cómo agregar colores oficiales

- ⚠️ **Transparente y Tornasol generan el mismo código (`TRN`).** Si vas a usar los dos, agrégalos como colores oficiales con códigos distintos (por ejemplo `TRA` y `TOR`).
- Si un color de texto libre se vuelve frecuente, o su código queda poco claro (Café → `CFA`, Lila → `LLI`), **conviene hacerlo oficial**. Para agregarlo hay que editar la lista `COLORES` en `src/lib/sku.js` con su nombre, código y muestra, por ejemplo:

  ```js
  { nombre: 'Café', codigo: 'CAF', muestra: '#6F4E37' },
  ```

- ⚠️ **Hazlo antes de crear productos con ese color.** Si ya hay productos con el código anterior (`CFA`), los nuevos empezarán otra numeración con el código nuevo (`CAF`), y el mismo color quedará con dos códigos.

---

## 5. Folio consecutivo

- **Es consecutivo por combinación de categoría y color**, no global. `VRPUL-AZL-` y `VRPUL-DOR-` llevan su propia numeración, cada una desde `001`.
- **Tiene 3 dígitos como mínimo** (`001`, `002`, … `999`). Los ceros a la izquierda mantienen todos los SKU del mismo largo y hacen que se ordenen bien en tablas y en Excel (`002` antes de `010`).
- **No tiene límite:** después de `999` sigue `1000`, `1001`, etc. El SKU crece a 14 caracteres y sigue dentro del rango permitido. Lo único que cambia es que, ordenando como texto, `1000` aparece antes que `999`.
- **Nunca se reutiliza un SKU.** Los productos desactivados también cuentan al calcular el siguiente folio: si `VRPUL-AZL-003` se dio de baja, la siguiente pulsera azul será `004` aunque la `003` ya no aparezca en el inventario.

---

## 6. Reglas de abreviación automática

Cuando una categoría o un color no tiene código fijo, el sistema lo abrevia así:

1. **Normaliza el texto:** quita acentos, pasa a mayúsculas y deja solo letras.
2. **Descarta palabras vacías:** DE, DEL, LA, LAS, EL, LOS, Y, E, CON, PARA.
3. **Si quedan varias palabras → sigla** con la inicial de cada una (máximo 3):
   - "Azul marino" → `AM`
   - "Accesorios para cabello" → `AC`
4. **Si queda una palabra → contracción:** primera letra + las siguientes consonantes hasta juntar 3:
   - "Turquesa" → T·R·Q → `TRQ`
   - "Brazaletes" → B·R·Z → `BRZ`
5. **Si la palabra tiene pocas consonantes,** se completa con vocales:
   - "Oro" → O·R + O → `ORO`
   - "Café" → C·F + A → `CFA`

> 💡 Como la abreviación es automática, dos nombres distintos pueden dar el mismo código (Transparente/Tornasol → `TRN`). Por eso conviene revisar las tablas de esta guía antes de crear una categoría o usar un color nuevo.

---

## 7. Casos especiales de bisutería artesanal

El SKU automático solo incluye categoría y color. Estos casos se resuelven con el **nombre del producto** o con **notas**, no con segmentos extra en el SKU:

### 7.1 Tallas o medidas

Cada talla es un producto distinto (se vende y se repone por separado), así que lleva su propio SKU. **La talla va en el nombre:**

| Producto | Nombre sugerido | SKU |
|----------|-----------------|-----|
| Anillo plateado talla 7 | Anillo liso plateado T7 | `VRANI-PLA-001` |
| Anillo plateado talla 8 | Anillo liso plateado T8 | `VRANI-PLA-002` |
| Pulsera 17 cm | Pulsera eslabón dorada 17cm | `VRPUL-DOR-001` |

### 7.2 Material y colección

El material (gold filled, plata, acero, hilo, cuarzo) y la colección (Verano, Clásicos, Boho…) **ya no forman parte del SKU**. Inclúyelos en el nombre si ayudan a distinguir piezas:

- "Collar cuarzo rosa Boho" → `VRCOL-ROS-001`
- "Pulsera hilo rojo Verano" → `VRPUL-ROJ-001`

### 7.3 Piezas únicas (one-of-a-kind)

Se registran como cualquier otro producto, con su categoría y color, y su stock inicial en 1. Al venderse quedan en **Agotados**. Si ya no se van a reponer, desactívalas: su SKU queda retirado y no se reutiliza.

### 7.4 Productos personalizados o bajo pedido

Para piezas con combinación de colores a elección del cliente, usa el color **Multicolor**. El detalle de la personalización va:

- en la **nota del stock inicial** o del movimiento de inventario, o
- en la **nota de la venta**, si se ajusta el total en el punto de venta.

> ⚠️ No inventes un color nuevo por cada personalización: satura la lista de colores y rompe la numeración.

---

## 8. Integración con el punto de venta y etiquetas

### 8.1 Compatibilidad con escáneres de código de barras

- **Simbología recomendada: Code 128.** Soporta letras mayúsculas, dígitos y guion sin checksum adicional, y es la más compatible con lectores genéricos (USB/Bluetooth).
- **EAN-13 no es viable:** exige 13 dígitos numéricos y no admite letras. Si algún día se vende en un marketplace que exija EAN/UPC, se manejaría como un código adicional (una columna nueva en `products`, ej. `barcode_ean`), nunca reemplazando el SKU interno.
- El SKU nunca empieza ni termina en guion, algo que algunos lectores mal configurados interpretan como delimitador. El formato `VR…` ya cumple esto por construcción.
- En el **punto de venta**, escanear un SKU en el buscador y presionar Enter agrega el producto al carrito si hay un solo resultado.
- Prueba cada lote nuevo de etiquetas con el lector real antes de imprimir muchas.

> ⚠️ Varios lectores económicos fallan con códigos Code 128 de más de ~20 caracteres en etiquetas pequeñas. El formato actual (13–14 caracteres) queda con margen de sobra.

### 8.2 Etiquetado físico en piezas pequeñas

- **Usa etiquetas tipo "mariposa" (butterfly/flag tag)** para pulseras, anillos y aretes: el código de barras va en la parte plana que se dobla sobre el hilo o la cadena, sin cubrir la joya.
- **Tamaño recomendado:** 10×20 mm para el área del código de barras en piezas muy pequeñas (aretes, anillos).
- **No imprimas el precio en la etiqueta:** los precios cambian y en el punto de venta se pueden ajustar por venta. El precio se consulta al escanear.
- Para **collares y tobilleras**, la etiqueta puede ir amarrada con un hilo corto, siempre que no dañe la pieza.
- Usa siempre **etiquetas de fondo blanco o claro**, también en piezas oscuras (acero negro, cuero), para que el lector tenga contraste.

---

## Resumen rápido

```
VR[CAT]-[COLOR]-[FOLIO]          ej. VRPUL-AZL-001

CAT    → código de la categoría (tabla 3.1)
         PUL, COL, ANI, ARE, TOB, SET fijos; el resto se abrevia solo
COLOR  → DOR, PLA, NEG, BLA, AZL, ROJ, VRD, ROS, MUL (oficiales)
         otros colores se abrevian solo (tabla 4.2)
FOLIO  → consecutivo por categoría + color, 3 dígitos mínimo, nunca se reutiliza
```

- El SKU se genera solo al crear el producto y **no cambia al editarlo**.
- Mismo color = mismo nombre siempre ("Rosa", no a veces "Rosado").
- Revisa las tablas antes de crear categorías o colores nuevos para evitar códigos repetidos.

---

## Anexo A — Formato manual anterior

Antes de la generación automática se usaba este patrón, escrito a mano. **Los productos que ya lo tienen lo conservan;** no se usa para productos nuevos.

```
[CAT]-[MAT]-[COL]-[VAR]-[NUM]        ej. PUL-GDF-VER-AZL-001
```

| Segmento | Significado | Códigos |
|----------|-------------|---------|
| `CAT` | Categoría | PUL, COL, ANI, ARE, TOB, SET |
| `MAT` | Material principal | GDF (gold filled), PLT (plata), ACE (acero inoxidable), HIL (hilo/cordón), CZO (piedras naturales/cuarzo), CUE (cuentas/mostacilla) |
| `COL` | Colección / estilo | VER (Verano), CLA (Clásicos), EDL (Edición limitada), INV (Invierno), MIN (Minimalista), BOH (Boho) |
| `VAR` | Variante (color) | Los colores oficiales de la sección 4.1, UNI (pieza única), PER (personalizado) |
| `NUM` | Folio | Consecutivo por combinación CAT-MAT-COL-VAR |

> Los códigos de material y colección del formato anterior pueden seguir usándose como referencia al escribir el **nombre** de los productos (sección 7.2).
