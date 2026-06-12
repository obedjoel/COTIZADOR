# Security Specification & Test Cases

## Data Invariants
1. **Identificadores Únicos**: El ID del documento debe coincidir exactamente con el campo `id` de la cotización para evitar sabotaje de índices.
2. **Campos Protegidos**: Una cotización no puede crearse sin el cliente, el proyecto, items y los campos de cálculo principales (`subtotal` y `total`).
3. **Formato de Ids**: Los IDs de cotizaciones deben cumplir estrictamente con caracteres alfanuméricos simples y guiones (`isValidId`).

## The "Dirty Dozen" Threat Payloads (Debe retornar PERMISSION_DENIED)
1. **Empty / Undefined payload** - {}
2. **Missing required fields** - `{"id": "2026-05-999"}` (Faltan cliente, proyecto, items, subtotal, total)
3. **Malformed Document ID** - Acceso a `cotizaciones/../etc/passwd`
4. **Invalid type for subtotal** - `{"id": "2026-05-999", "subtotal": "cien"}`
5. **Giant malicious title** - Cotización con proyecto de 5 Megabytes (Vulnerabilidad de Denegación de Billetera/Agotamiento de memoria)
6. **Mismatch key injection** - El ID del documento es `2026-05-001` pero el ID de la carga es `2026-05-002` (Ataque "Shadow Update")
7. **Malformed structure (Unauthenticated write)** - Intento de guardar una cotización sin estar logueado.
8. **Malicious list manipulation** - Carga masiva inyectada en items con un array de 50,000 elementos.
9. **Mutable modification** - Intento de cambiar el ID del documento en un update.
10. **Type Poisoning (Boolean injection)** - Intentar pasar `total: true`.
11. **Client Timestamp Spoofing** - Forzar `createdAt` con fechas falsas del navegador (bloqueable con `request.time`).
12. **Junk Fields Injection** - Intentar insertar `"unrequestedField": "maliciousValue"` (Vulnerabilidad de inyección silenciosa).

## Test Runner (Mocks)
Los casos de prueba descritos en `DRAFT_firestore.rules` son validados simulando conexiones del emulador de Firebase donde cada uno de los payloads anteriores es rechazado explícitamente en el block match.
