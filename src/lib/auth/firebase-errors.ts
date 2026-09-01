/**
 * Traducción de los códigos de error de Firebase Auth a mensajes en español
 * rioplatense, para mostrar debajo del formulario. Cualquier código no listado
 * cae en un mensaje genérico.
 */
const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "El email no tiene un formato válido.",
  "auth/invalid-credential": "Email o contraseña incorrectos.",
  "auth/wrong-password": "Email o contraseña incorrectos.",
  "auth/user-not-found": "No hay ninguna cuenta con ese email.",
  "auth/user-disabled": "Esta cuenta está deshabilitada.",
  "auth/email-already-in-use":
    "Ya existe una cuenta con ese email. Probá iniciar sesión.",
  "auth/weak-password": "La contraseña tiene que tener al menos 6 caracteres.",
  "auth/missing-password": "Ingresá tu contraseña.",
  "auth/too-many-requests":
    "Demasiados intentos. Esperá unos minutos y volvé a probar.",
  "auth/popup-blocked":
    "El navegador bloqueó la ventana de Google. Habilitala y reintentá.",
  "auth/network-request-failed":
    "Falló la conexión. Revisá tu internet y volvé a probar.",
  "auth/account-exists-with-different-credential":
    "Ese email ya está registrado con otro método de acceso.",
  "auth/operation-not-allowed":
    "Este método de acceso no está habilitado en el proyecto.",
};

export function authErrorMessage(code: string | undefined): string {
  return (
    (code && MESSAGES[code]) ||
    "No se pudo completar la operación. Probá de nuevo en un momento."
  );
}
