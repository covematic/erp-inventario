-- =====================================================================
-- ERP de Inventario - Esquema PostgreSQL
-- Todas las cantidades de stock se protegen con CHECK (>= 0).
-- El stock solo se modifica desde los servicios de movimientos.
-- =====================================================================

DROP TABLE IF EXISTS alertas, movimientos_inventario, ajustes, detalle_devoluciones, devoluciones,
  detalle_salidas, salidas, detalle_entradas, entradas, stock, productos, proyectos, areas,
  almacenes, proveedores, categorias, usuarios, roles CASCADE;
DROP SEQUENCE IF EXISTS seq_entrada, seq_salida, seq_devolucion, seq_ajuste;

-- ---------- Secuencias de numeración de documentos ----------
CREATE SEQUENCE seq_entrada START 1;
CREATE SEQUENCE seq_salida START 1;
CREATE SEQUENCE seq_devolucion START 1;
CREATE SEQUENCE seq_ajuste START 1;

-- ---------- Seguridad ----------
CREATE TABLE roles (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(30) NOT NULL UNIQUE CHECK (nombre IN ('ADMIN','ALMACEN','SUPERVISOR')),
  descripcion VARCHAR(200)
);

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(120) NOT NULL,
  email         VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(200) NOT NULL,
  rol_id        INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Catálogos ----------
CREATE TABLE categorias (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,
  descripcion VARCHAR(250),
  activo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE proveedores (
  id           SERIAL PRIMARY KEY,
  ruc          VARCHAR(20) NOT NULL UNIQUE,
  razon_social VARCHAR(200) NOT NULL,
  contacto     VARCHAR(120),
  telefono     VARCHAR(30),
  email        VARCHAR(150),
  direccion    VARCHAR(250),
  activo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE almacenes (
  id        SERIAL PRIMARY KEY,
  codigo    VARCHAR(20) NOT NULL UNIQUE,
  nombre    VARCHAR(120) NOT NULL,
  ubicacion VARCHAR(250),
  activo    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE areas (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE proyectos (
  id           SERIAL PRIMARY KEY,
  codigo       VARCHAR(30) NOT NULL UNIQUE,
  nombre       VARCHAR(200) NOT NULL,
  cliente      VARCHAR(200),
  responsable  VARCHAR(120) NOT NULL,
  ubicacion    VARCHAR(250),
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE,
  estado       VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','CERRADO')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE productos (
  id             SERIAL PRIMARY KEY,
  sku            VARCHAR(40) NOT NULL UNIQUE,
  nombre         VARCHAR(200) NOT NULL,
  descripcion    TEXT,
  categoria_id   INT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
  proveedor_id   INT REFERENCES proveedores(id) ON DELETE SET NULL,
  unidad_medida  VARCHAR(20) NOT NULL,
  precio_compra  NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
  precio_venta   NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  costo_promedio NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (costo_promedio >= 0),
  stock_minimo   NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existencias por producto y almacén.
-- disponible: se puede despachar
-- comprometido: reservado por guías pendientes de despacho
-- danado / defectuoso: devoluciones no aptas, fuera del stock disponible
CREATE TABLE stock (
  producto_id  INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  almacen_id   INT NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  disponible   NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (disponible >= 0),
  comprometido NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (comprometido >= 0),
  danado       NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (danado >= 0),
  defectuoso   NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (defectuoso >= 0),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (producto_id, almacen_id)
);

-- ---------- Entradas ----------
CREATE TABLE entradas (
  id               SERIAL PRIMARY KEY,
  numero           VARCHAR(20) NOT NULL UNIQUE,
  documento_ref    VARCHAR(60),               -- factura / guía de remisión del proveedor
  fecha            DATE NOT NULL,
  proveedor_id     INT REFERENCES proveedores(id) ON DELETE RESTRICT,  -- opcional: inventario inicial u otros ingresos
  almacen_id       INT NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  usuario_id       INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  estado           VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA' CHECK (estado IN ('CONFIRMADA','ANULADA')),
  total            NUMERIC(16,4) NOT NULL DEFAULT 0 CHECK (total >= 0),
  observaciones    TEXT,
  anulado_por      INT REFERENCES usuarios(id),
  anulado_at       TIMESTAMPTZ,
  motivo_anulacion TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_entradas (
  id             SERIAL PRIMARY KEY,
  entrada_id     INT NOT NULL REFERENCES entradas(id) ON DELETE CASCADE,
  producto_id    INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad       NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  costo_unitario NUMERIC(14,4) NOT NULL CHECK (costo_unitario >= 0),
  costo_total    NUMERIC(16,4) NOT NULL CHECK (costo_total >= 0),
  UNIQUE (entrada_id, producto_id)
);

-- ---------- Salidas (guías) ----------
CREATE TABLE salidas (
  id                     SERIAL PRIMARY KEY,
  numero                 VARCHAR(20) NOT NULL UNIQUE,
  numero_guia            VARCHAR(60),         -- número de la guía física presentada
  fecha                  DATE NOT NULL,
  almacen_id             INT NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  tipo_destino           VARCHAR(20) NOT NULL CHECK (tipo_destino IN ('PROYECTO','AREA')),
  proyecto_id            INT REFERENCES proyectos(id) ON DELETE RESTRICT,
  area_id                INT REFERENCES areas(id) ON DELETE RESTRICT,
  motivo                 VARCHAR(30) NOT NULL CHECK (motivo IN ('VENTA','CONSUMO_INTERNO','PROYECTO','TRASLADO','DANO','PERDIDA','OTROS')),
  responsable            VARCHAR(120) NOT NULL,  -- quien recibe / solicita
  requiere_devolucion    BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_retorno_estimada DATE,
  estado                 VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE','DESPACHADA','ANULADA')),
  usuario_id             INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  despachado_por         INT REFERENCES usuarios(id),
  despachado_at          TIMESTAMPTZ,
  anulado_por            INT REFERENCES usuarios(id),
  anulado_at             TIMESTAMPTZ,
  motivo_anulacion       TEXT,
  observaciones          TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_destino CHECK (
    (tipo_destino = 'PROYECTO' AND proyecto_id IS NOT NULL) OR
    (tipo_destino = 'AREA' AND area_id IS NOT NULL)
  )
);

CREATE TABLE detalle_salidas (
  id                SERIAL PRIMARY KEY,
  salida_id         INT NOT NULL REFERENCES salidas(id) ON DELETE CASCADE,
  producto_id       INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad          NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  cantidad_devuelta NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (cantidad_devuelta >= 0),
  costo_unitario    NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  UNIQUE (salida_id, producto_id),
  CONSTRAINT chk_devuelta CHECK (cantidad_devuelta <= cantidad)
);

-- ---------- Devoluciones ----------
CREATE TABLE devoluciones (
  id            SERIAL PRIMARY KEY,
  numero        VARCHAR(20) NOT NULL UNIQUE,
  fecha         DATE NOT NULL,
  salida_id     INT NOT NULL REFERENCES salidas(id) ON DELETE RESTRICT,
  motivo        VARCHAR(200) NOT NULL,
  responsable   VARCHAR(120) NOT NULL,   -- quien devuelve
  usuario_id    INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  observaciones TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE detalle_devoluciones (
  id                SERIAL PRIMARY KEY,
  devolucion_id     INT NOT NULL REFERENCES devoluciones(id) ON DELETE CASCADE,
  detalle_salida_id INT NOT NULL REFERENCES detalle_salidas(id) ON DELETE RESTRICT,
  producto_id       INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad          NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  estado_producto   VARCHAR(20) NOT NULL CHECK (estado_producto IN ('BUENO','DANADO','DEFECTUOSO'))
);

-- ---------- Ajustes (aprobados por supervisor/admin) ----------
CREATE TABLE ajustes (
  id          SERIAL PRIMARY KEY,
  numero      VARCHAR(20) NOT NULL UNIQUE,
  fecha       DATE NOT NULL,
  producto_id INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  almacen_id  INT NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  tipo        VARCHAR(30) NOT NULL CHECK (tipo IN ('INCREMENTO','DISMINUCION','BAJA_DANADO','BAJA_DEFECTUOSO')),
  cantidad    NUMERIC(14,3) NOT NULL CHECK (cantidad > 0),
  motivo      TEXT NOT NULL,
  usuario_id  INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Kardex / historial de movimientos ----------
-- saldo = stock físico del producto en el almacén después del movimiento
--         (disponible + comprometido + dañado + defectuoso)
CREATE TABLE movimientos_inventario (
  id                  BIGSERIAL PRIMARY KEY,
  fecha               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  producto_id         INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  almacen_id          INT NOT NULL REFERENCES almacenes(id) ON DELETE RESTRICT,
  tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA','SALIDA','DEVOLUCION','AJUSTE','ANULACION')),
  documento_tipo      VARCHAR(20) NOT NULL CHECK (documento_tipo IN ('ENTRADA','SALIDA','DEVOLUCION','AJUSTE')),
  documento_id        INT NOT NULL,
  documento_numero    VARCHAR(20) NOT NULL,
  cantidad_entrada    NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (cantidad_entrada >= 0),
  cantidad_salida     NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (cantidad_salida >= 0),
  cantidad_devolucion NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (cantidad_devolucion >= 0),
  estado_stock        VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado_stock IN ('DISPONIBLE','DANADO','DEFECTUOSO')),
  saldo               NUMERIC(14,3) NOT NULL CHECK (saldo >= 0),
  costo_unitario      NUMERIC(14,4) NOT NULL DEFAULT 0,
  valor               NUMERIC(16,4) NOT NULL DEFAULT 0,
  usuario_id          INT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  observacion         TEXT
);

-- ---------- Registro de alertas por eventos (intentos rechazados) ----------
CREATE TABLE alertas (
  id          SERIAL PRIMARY KEY,
  tipo        VARCHAR(40) NOT NULL,
  mensaje     TEXT NOT NULL,
  producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id  INT REFERENCES usuarios(id) ON DELETE SET NULL,
  leida       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Índices ----------
CREATE INDEX idx_productos_categoria ON productos(categoria_id);
CREATE INDEX idx_mov_producto_fecha ON movimientos_inventario(producto_id, fecha);
CREATE INDEX idx_mov_tipo ON movimientos_inventario(tipo);
CREATE INDEX idx_mov_usuario ON movimientos_inventario(usuario_id);
CREATE INDEX idx_mov_documento ON movimientos_inventario(documento_numero);
CREATE INDEX idx_salidas_proyecto ON salidas(proyecto_id);
CREATE INDEX idx_salidas_fecha ON salidas(fecha);
CREATE INDEX idx_devoluciones_salida ON devoluciones(salida_id);
CREATE INDEX idx_det_salidas_producto ON detalle_salidas(producto_id);
