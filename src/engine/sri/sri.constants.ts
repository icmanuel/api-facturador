export const SRI_URLS = {
  test: {
    reception: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    authorization: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
  production: {
    reception: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    authorization: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
} as const;

// SRI SOAP action names
export const SRI_RECEPTION_METHOD = 'validarComprobante';
export const SRI_AUTHORIZATION_METHOD = 'autorizacionComprobante';

// SRI response states
export const SRI_STATE_RECEIVED = 'RECIBIDA';
export const SRI_STATE_RETURNED = 'DEVUELTA';
export const SRI_STATE_AUTHORIZED = 'AUTORIZADO';
export const SRI_STATE_NOT_AUTHORIZED = 'NO AUTORIZADO';
