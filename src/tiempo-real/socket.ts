import { io, Socket } from 'socket.io-client';

/** Conexión de tiempo real con el backend principal. El token viaja en el saludo inicial. */
export function conectarTiempoReal(token: string): Socket {
  return io({ path: '/socket.io', auth: { token }, transports: ['websocket'] });
}
