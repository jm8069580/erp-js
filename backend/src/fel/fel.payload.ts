import {
  FelConfigRow,
  FelDocumento,
  FelInvoiceWithRelations,
  FEL_TIPO_DOCUMENTO_FACTURA,
  FEL_TIPO_EMISION_NORMAL,
} from './fel.types';
import { decimal, toFelDate } from './fel.util';

const CONSUMIDOR_FINAL = 'CONSUMIDOR FINAL';
const DEFAULT_CPBS = '4320';
const DEFAULT_CPBS_ABREV = '43';

export function buildDocumentPayload(
  invoice: FelInvoiceWithRelations,
  cfg: FelConfigRow,
): FelDocumento {
  const customer = invoice.customer;
  const hasRuc = Boolean(customer?.felRuc);

  const listaItems = invoice.items.map((item) => {
    const subtotal = decimal(item.unitPrice * item.quantity);
    const itbms = decimal(subtotal * item.itbmsRate);
    return {
      descripcion: item.description,
      codigo: '',
      unidadMedida: 'und',
      cantidad: item.quantity,
      fechaFabricacion: '',
      fechaCaducidad: '',
      codigoCPBSAbrev: DEFAULT_CPBS_ABREV,
      codigoCPBS: DEFAULT_CPBS,
      unidadMedidaCPBS: '',
      infoItem: item.description,
      precioUnitario: decimal(item.unitPrice),
      precioUnitarioDescuento: 0,
      precioItem: subtotal,
      precioAcarreo: 0,
      precioSeguro: 0,
      valorTotal: decimal(subtotal + itbms),
      codigoGTIN: '',
      cantGTINCom: 0,
      codigoGTINInv: '',
      cantGTINComInv: 0,
      tasaITBMS: item.itbmsRate > 0 ? '01' : '00',
      valorITBMS: itbms,
      tasaISC: '0',
      valorISC: 0,
    };
  });

  const subtotal = decimal(invoice.subtotal);
  const itbms = decimal(invoice.itbms);
  const total = decimal(invoice.total);

  return {
    codigoSucursalEmisor: cfg.sucursal,
    tipoSucursal: '',
    datosTransaccion: {
      tipoEmision: FEL_TIPO_EMISION_NORMAL,
      tipoDocumento: FEL_TIPO_DOCUMENTO_FACTURA,
      numeroDocumentoFiscal: String(invoice.folio),
      puntoFacturacionFiscal: cfg.punto,
      fechaEmision: toFelDate(invoice.date),
      fechaSalida: '',
      naturalezaOperacion: '01',
      tipoOperacion: '1',
      destinoOperacion: '1',
      formatoCAFE: '3',
      entregaCAFE: '3',
      envioContenedor: '1',
      procesoGeneracion: '1',
      tipoVenta: '1',
      informacionInteres: '',
      cliente: {
        tipoClienteFE: '01',
        tipoContribuyente: hasRuc ? '1' : '2',
        numeroRUC: customer?.felRuc ?? '',
        digitoVerificadorRUC: customer?.felDv ?? '',
        razonSocial: hasRuc
          ? (customer?.name ?? invoice.customerName)
          : CONSUMIDOR_FINAL,
        direccion: customer?.address ?? '',
        codigoUbicacion: customer?.codigoUbicacion ?? '',
        provincia: customer?.provincia ?? '',
        distrito: customer?.distrito ?? '',
        corregimiento: customer?.corregimiento ?? '',
        paisExtranjero: '',
        telefono1: customer?.phone ?? '',
        telefono2: '',
        telefono3: '',
        correoElectronico1: customer?.email ?? '',
        correoElectronico2: '',
        correoElectronico3: '',
        pais: customer?.pais ?? 'PA',
        paisOtro: '',
      },
    },
    listaItems,
    totalesSubTotales: {
      totalPrecioNeto: subtotal,
      totalITBMS: itbms,
      totalISC: '',
      totalMontoGravado: itbms,
      totalDescuento: '',
      totalAcarreoCobrado: '',
      valorSeguroCobrado: '',
      totalFactura: total,
      totalValorRecibido: total,
      tiempoPago: '1',
      nroItems: String(invoice.items.length),
      totalTodosItems: total,
      listaFormaPago: [
        {
          formaPagoFact: '02',
          descFormaPago: '',
          valorCuotaPagada: total,
        },
      ],
    },
    usoPosterior: {
      cufe: '',
    },
  };
}