-- CreateTable
CREATE TABLE "ventas" (
    "id_venta" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL,
    "cliente" TEXT NOT NULL,
    "producto" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT '$',
    "importe" DECIMAL NOT NULL,
    "medio_pago" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ventas_fecha_idx" ON "ventas"("fecha");

-- CreateIndex
CREATE INDEX "ventas_cliente_idx" ON "ventas"("cliente");
