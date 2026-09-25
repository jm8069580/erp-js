import { FelConfig, Invoice } from '@prisma/client';

export const FEL_TIPO_DOCUMENTO_FACTURA = '01';
export const FEL_TIPO_EMISION_NORMAL = '01';

export interface FelLoginResponse {
  token: string;
}

export interface FelDocumento {
  codigoSucursalEmisor: string;
  tipoSucursal: string;
  datosTransaccion: {
    tipoEmision: string;
    tipoDocumento: string;
    numeroDocumentoFiscal: string;
    puntoFacturacionFiscal: string;
    fechaEmision: string;
    fechaSalida: string;
    naturalezaOperacion: string;
    tipoOperacion: string;
    destinoOperacion: string;
    formatoCAFE: string;
    entregaCAFE: string;
    envioContenedor: string;
    procesoGeneracion: string;
    tipoVenta: string;
    informacionInteres: string;
    cliente: {
      tipoClienteFE: string;
      tipoContribuyente: string;
      numeroRUC: string;
      digitoVerificadorRUC: string;
      razonSocial: string;
      direccion: string;
      codigoUbicacion: string;
      provincia: string;
      distrito: string;
      corregimiento: string;
      paisExtranjero: string;
      telefono1: string;
      telefono2: string;
      telefono3: string;
      correoElectronico1: string;
      correoElectronico2: string;
      correoElectronico3: string;
      pais: string;
      paisOtro: string;
    };
  };
  listaItems: FelItem[];
  totalesSubTotales: {
    totalPrecioNeto: number | string;
    totalITBMS: number | string;
    totalISC: number | string;
    totalMontoGravado: number | string;
    totalDescuento: number | string;
    totalAcarreoCobrado: number | string;
    valorSeguroCobrado: number | string;
    totalFactura: number | string;
    totalValorRecibido: number | string;
    tiempoPago: string;
    nroItems: string;
    totalTodosItems: number | string;
    listaFormaPago: Array<{
      formaPagoFact: string;
      descFormaPago: string;
      valorCuotaPagada: number | string;
    }>;
  };
  usoPosterior: {
    cufe: string;
  };
}

export interface FelItem {
  descripcion: string;
  codigo: string;
  unidadMedida: string;
  cantidad: number;
  fechaFabricacion: string;
  fechaCaducidad: string;
  codigoCPBSAbrev: string;
  codigoCPBS: string;
  unidadMedidaCPBS: string;
  infoItem: string;
  precioUnitario: number;
  precioUnitarioDescuento: number;
  precioItem: number;
  precioAcarreo: number;
  precioSeguro: number;
  valorTotal: number;
  codigoGTIN: string;
  cantGTINCom: number;
  codigoGTINInv: string;
  cantGTINComInv: number;
  tasaITBMS: string;
  valorITBMS: number;
  tasaISC: string;
  valorISC: number;
}

export interface FelDatosDocumento {
  codigoSucursalEmisor: string;
  numeroDocumentoFiscal: string;
  puntoFacturacionFiscal: string;
  tipoDocumento: string;
  tipoEmision: string;
}

export interface FelSendResult {
  accepted: boolean;
  cufe?: string;
  protocolo?: string;
  mensaje?: string;
}

export interface FelEstadoResult {
  estado?: string;
  cufe?: string;
  protocolo?: string;
  mensaje?: string;
}

export interface FelEnviarResponse {
  codigo?: string | number;
  mensaje?: string;
  cufe?: string;
  cufeDocFiscal?: string;
  protocolo?: string;
  etiquetas?: unknown;
  [key: string]: unknown;
}

export type FelInvoiceWithRelations = Invoice & {
  customer?: {
    name?: string;
    felRuc?: string | null;
    felDv?: string | null;
    provincia?: string | null;
    distrito?: string | null;
    corregimiento?: string | null;
    codigoUbicacion?: string | null;
    pais?: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    itbmsRate: number;
    subtotal: number;
  }>;
};

export type FelConfigRow = Pick<
  FelConfig,
  | 'razonSocial'
  | 'ruc'
  | 'dv'
  | 'direccion'
  | 'codigoUbicacion'
  | 'provincia'
  | 'distrito'
  | 'corregimiento'
  | 'sucursal'
  | 'punto'
  | 'pais'
>;