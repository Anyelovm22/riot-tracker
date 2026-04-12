export function getApiErrorMessage(err: any, fallback: string) {
  const status = err?.response?.status;

  if (status === 429) {
    return 'Demasiadas solicitudes a Riot. Esperá un momento antes de refrescar.';
  }

  if (status === 404) {
    return 'No se encontraron datos para esta consulta.';
  }

  if (status === 400) {
    return err?.response?.data?.message || 'La solicitud fue inválida.';
  }

  if (status === 403) {
    return 'Riot rechazó la solicitud. Revisá la API key o los permisos.';
  }

  return err?.response?.data?.message || fallback;
}